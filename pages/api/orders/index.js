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

const fetchLineItemDetailsGraphQL = async (productId, store) => {
    const query = `
    {
        product(id: "gid://shopify/Product/${productId}") {
            images(first: 1) {
                edges {
                    node {
                        src
                    }
                }
            }
            metafields(first: 10, namespace: "custom") {
                edges {
                    node {
                        key
                        value
                    }
                }
            }
        }
    }`;

    try {
        const response = await axios.post(`${store.url}/admin/api/2023-01/graphql.json`, { query }, {
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': store.token }
        });

        const imageSrc = response.data.data.product.images.edges.length > 0 ? response.data.data.product.images.edges[0].node.src : null;
        const metafields = response.data.data.product.metafields.edges.map(edge => ({ key: edge.node.key, value: edge.node.value }));

        return { imageSrc, metafields };
    } catch (error) {
        console.error('Error:', error);
        // Handle errors and rate limits
        // ...
        return { imageSrc: null, metafields: [] };
    }
};

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { start_date, end_date, vendor, tag } = req.query;

        const stores = [
          { url: 'https://b0cac9-2.myshopify.com', token: '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' },
            // Add more stores as needed
        ];

        let allAggregatedData = {};

        for (const store of stores) {
            const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': store.token };
            const ordersEndpoint = `${store.url}/admin/api/2023-01/orders.json?tags=${tag}&created_at_min=${start_date}&created_at_max=${end_date}&status=open&fields=id,line_items`;

            try {
                const allOrders = await fetchAllPages(ordersEndpoint, headers);
                
                for (const order of allOrders) {
                    for (const item of order.line_items) {
                        if (vendor && item.vendor !== vendor) continue;
                        const sku = item.sku || 'N/A';
                        const lineItemDetails = await fetchLineItemDetailsGraphQL(item.product_id, store);

                        if (!allAggregatedData[sku]) {
                            allAggregatedData[sku] = {
                                sku,
                                productName: item.name,
                                totalQuantity: 0,
                                mainImage: lineItemDetails.imageSrc,
                                productId: item.product_id,
                                arabicTitle: null,
                                patternCode: null
                            };

                            const arabicTitleField = lineItemDetails.metafields.find(m => m.key === 'arabic_title');
                            const patternCodeField = lineItemDetails.metafields.find(m => m.key === 'pattern_code');

                            allAggregatedData[sku].arabicTitle = arabicTitleField ? arabicTitleField.value : null;
                            allAggregatedData[sku].patternCode = patternCodeField ? patternCodeField.value : null;
                        }
                        allAggregatedData[sku].totalQuantity += item.quantity;
                    }
                }
            } catch (error) {
                console.error(`Error fetching data from Shopify store ${store.url}:`, error);
            }
        }

        const sortedData = Object.values(allAggregatedData).sort((a, b) => a.sku.localeCompare(b.sku));

        res.status(200).json(sortedData);
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
