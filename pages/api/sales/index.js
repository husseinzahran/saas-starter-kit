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
                if (nextPageUrl) await delay(100);
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

// const fetchLineItemDetailsGraphQL = async (productId, store) => {
//     const query = `
//     {
//         product(id: "gid://shopify/Product/${productId}") {
//             images(first: 1) {
//                 edges {
//                     node {
//                         src
//                     }
//                 }
//             }
//             variants(first: 250) {
//                 edges {
//                     node {
//                         id
//                         sku
//                         price
//                         inventoryItem {
//                           unitCost {
//                             amount
//                             currencyCode
//                           }
//                         }
//                       }
//                 }
//             }
//             metafields(first: 10, namespace: "custom") {
//                 edges {
//                     node {
//                         key
//                         value
//                     }
//                 }
//             }
//         }
//     }`;

//     try {
//         const response = await axios.post(`${store.url}/admin/api/2023-01/graphql.json`, { query }, {
//             headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': store.token }
//         });

//         const productData = response.data.data.product;
//         const imageSrc = productData.images.edges.length > 0 ? productData.images.edges[0].node.src : null;
//         const variants = productData.variants.edges.map(edge => ({
//             id: edge.node.id,
//             sku: edge.node.sku,
//             price: edge.node.price,
//             inventoryItem: edge.node.inventoryItem
//             // Map other variant details here
//         }));
//         const metafields = productData.metafields.edges.map(edge => ({
//             key: edge.node.key,
//             value: edge.node.value
//         }));

//         return { imageSrc, variants, metafields };
//     } catch (error) {
//         console.error('Error:', error);
//         // Handle errors and rate limits
//         // ...
//         return { imageSrc: null, variants: [], metafields: [] };
//     }
// };

const fetchLineItemDetailsGraphQL = async (variantId, store) => {
  const query = `
  {
      productVariant(id: "gid://shopify/ProductVariant/${variantId}") {
          id
          sku
          price
          image {
              src
          }
          inventoryItem {
              unitCost {
                  amount
                  currencyCode
              }
          }
          product {
              metafields(first: 10, namespace: "custom") {
                  edges {
                      node {
                          key
                          value
                      }
                  }
              }
          }
      }
  }`;

  try {
      const response = await axios.post(`${store.url}/admin/api/2023-01/graphql.json`, { query }, {
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': store.token }
      });

      const variantData = response.data.data.productVariant;
      const imageSrc = variantData.image ? variantData.image.src : null;
      const variant = {
          id: variantData.id,
          sku: variantData.sku,
          price: variantData.price,
          inventoryItem: variantData.inventoryItem
      };
      const metafields = variantData.product.metafields.edges.map(edge => ({
          key: edge.node.key,
          value: edge.node.value
      }));

      return { imageSrc, variant, metafields };
  } catch (error) {
      console.error('Error:', error);
      // Handle errors and rate limits
      return { imageSrc: null, variant: null, metafields: [] };
  }
};

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { start_date, end_date } = req.query;

        const stores = [
            { url: 'https://best-brands-in-egypt.myshopify.com', token: `${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN}` },
            // Add more stores as needed
        ];

        let allAggregatedData = {orders:[]};

        for (const store of stores) {
            const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': store.token };
            const ordersEndpoint = `${store.url}/admin/api/2023-01/orders.json?created_at_min=${start_date}&created_at_max=${end_date}&fields=id,line_items,createdAt,name`;

            try {
                const allOrders = await fetchAllPages(ordersEndpoint, headers);
                
                for (const order of allOrders) {
                  if (!order.line_items || order.line_items.length === 0) {
                      console.log('No line items found for order:', order.id);
                      continue;
                  }

                  for (const lineItem of order.line_items) {
                      const productDetails = await fetchLineItemDetailsGraphQL(lineItem.variant_id, store);
                      lineItem.productDetails = productDetails;
                  }
                  allAggregatedData.orders.push(order);
              }
            } catch (error) {
                console.error(`Error fetching data from Shopify store ${store.url}:`, error);
            }
        }

        //const sortedData = Object.values(allAggregatedData).sort((a, b) => a.sku.localeCompare(b.sku));

        res.status(200).json(allAggregatedData);
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
