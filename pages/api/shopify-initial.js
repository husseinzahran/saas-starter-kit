// pages/api/shopify.js
import axios from 'axios';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchAllPages = async (url, headers) => {
    let results = [];
    let nextPageUrl = url;

    while (nextPageUrl) {
        try {
            const response = await axios.get(nextPageUrl, { headers });
            results = results.concat(response.data.orders);

            const linkHeader = response.headers['link'];
            if (linkHeader) {
                const matches = linkHeader.match(/<(.*?)>; rel="next"/);
                nextPageUrl = matches ? matches[1] : null;
                if (nextPageUrl) await delay(500);
            } else {
                nextPageUrl = null;
            }
        } catch (error) {
            // Handle errors and rate limits
            // ...
        }
    }

    return results;
};

const fetchMetafields = async (entityId, headers, storeUrl, type) => {
    const endpoint = `${storeUrl}/admin/api/2023-01/${type}/${entityId}/metafields.json`;
    try {
        await delay(500);
        const response = await axios.get(endpoint, { headers });
        return response.data.metafields;
    } catch (error) {
        // Handle errors and rate limits
        // ...
    }
};

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { start_date, end_date, vendor, tag } = req.query;

        const stores = [
            { url: 'https://b0cac9-2.myshopify.com', token: `${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN_HUSHY}` },
            { url: 'https://best-brands-in-egypt.myshopify.com', token: `${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN}` },
            // Add more stores as needed
        ];

        let allAggregatedData = {};
        let productIds = new Set();
        //const tag = 'PO ORDERS';
        for (const store of stores) {
            const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': store.token };
            const ordersEndpoint = `${store.url}/admin/api/2023-01/orders.json?tags=${tag}&created_at_min=${start_date}&created_at_max=${end_date}&status=open&fields=id,line_items,tags`;

            try {
                const allOrders = await fetchAllPages(ordersEndpoint, headers);
                
                for (const order of allOrders) {
                    const values = order.tags.split(',').map(item => item.trim());
                    console.log(values);
                    if (Array.isArray(values) && values.includes(tag)){
                        for (const item of order.line_items) {
                            if (vendor && item.vendor !== vendor) continue;
                            if (item.fulfillable_quantity > 0){
                                const sku = item.sku || 'N/A';
                            productIds.add(item.product_id);

                            if (!allAggregatedData[sku]) {
                                allAggregatedData[sku] = {
                                    sku,
                                    productName: item.name,
                                    totalQuantity: 0,
                                    totalFulfillableQuantity: 0,
                                    mainImage: null,
                                    productId: item.product_id,
                                    arabicTitle: null,
                                    patternCode: null
                                };
                            }
                            allAggregatedData[sku].totalQuantity += item.quantity;
                            allAggregatedData[sku].totalFulfillableQuantity += item.fulfillable_quantity;
                            }
                            
                        }
                    }
                }
            } catch (error) {
                console.error(`Error fetching data from Shopify store ${store.url}:`, error);
                // Handle error or continue to next store
            }
        }

        // Process images and metafields for products
        for (let productId of productIds) {
            for (let store of stores) {
                const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': store.token };

                try {
                    const [productImagesResponse, productMetafields] = await Promise.all([
                        axios.get(`${store.url}/admin/api/2023-01/products/${productId}/images.json`, { headers }),
                        fetchMetafields(productId, headers, store.url, 'products')
                    ]);

                    const firstImageUrl = productImagesResponse.data.images.length > 0 ? productImagesResponse.data.images[0].src : null;
                    const arabicTitleField = productMetafields.find(m => m.key === 'arabic_title' && m.namespace === 'custom');
                    const patternCodeField = productMetafields.find(m => m.key === 'pattern_code' && m.namespace === 'custom');

                    for (let sku in allAggregatedData) {
                        if (allAggregatedData[sku].productId === productId) {
                            allAggregatedData[sku].mainImage = firstImageUrl || allAggregatedData[sku].mainImage;
                            allAggregatedData[sku].arabicTitle = arabicTitleField ? arabicTitleField.value : allAggregatedData[sku].arabicTitle;
                            allAggregatedData[sku].patternCode = patternCodeField ? patternCodeField.value : allAggregatedData[sku].patternCode;
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching product details for productId ${productId} from store ${store.url}:`, error);
                    // Handle error or continue to next product/store
                }
            }
        }

        const sortedData = Object.values(allAggregatedData).sort((a, b) => a.sku.localeCompare(b.sku));

        res.status(200).json(sortedData);
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
