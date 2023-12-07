// pages/api/shopify.js
import axios from 'axios';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchOrderById = async (orderId, store) => {
    try {
      const response = await axios.get(`${store.url}/admin/api/2023-01/orders/${orderId}.json`, {
        headers: {
          'Content-Type': 'application/json', 
          'X-Shopify-Access-Token': store.token
        }
      });
      return response.data.order;
    } catch (error) {
      console.error(`Error fetching order ${orderId} from Shopify store ${store.url}:`, error);
      throw error;
    }
  };

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
      const { orderId } = req.query;
  
      if (!orderId) {
        res.status(400).json({ error: 'Missing order ID' });
        return;
      }
  
      const store = { url: 'https://best-brands-in-egypt.myshopify.com', token: `${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN}` };
  
      try {
        const order = await fetchOrderById(orderId, store);
        
        if (!order.line_items || order.line_items.length === 0) {
          console.log('No line items found for order:', orderId);
          res.status(404).json({ error: 'No line items found for order' });
          return;
        }
  
        for (const lineItem of order.line_items) {
          const productDetails = await fetchLineItemDetailsGraphQL(lineItem.variant_id, store);
          lineItem.productDetails = productDetails;
        }
  
        res.status(200).json(order);
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }