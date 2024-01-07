// File: pages/api/processOrders.js

export default async function handler(req, res) {
    // Assuming you get order IDs from the request body or query
      
    const orderIds = req.body.orderIds || [];
    const shop = req.body.shop;
    const api = `${process.env.API_DOMAIN}` || 'http://app.giftsny.com'

    async function callExternalApi(orderId) {
      const url = `${api}/api/sales/store-order?orderId=${orderId}&shop=${shop}`;
  
       // Set up headers for the fetch call
        // Extract Cookie header from the incoming request
        const cookie = req.headers.cookie;

        // Set up headers for the fetch call, including the extracted Cookie
        const headers = {
          'Content-Type': 'application/json',
          'Cookie': cookie // Use the extracted Cookie here
        };
  
      try {
        const response = await fetch(url, { headers: headers });
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error calling external API:', error);
        return null;
      }
    }
  
    // Function to process each order ID with a delay
    function processOrderWithDelay(orderId, delay) {
      return new Promise(resolve => {
        setTimeout(async () => {
          const result = await callExternalApi(orderId);
          resolve(result);
        }, delay);
      });
    }
  
    // Process each order ID with a 3-second delay
    const results = [];
    for (const orderId of orderIds) {
        
      const result = await processOrderWithDelay(orderId, 1000); // 3000 milliseconds = 3 seconds
      results.push(result);
    }
  
    res.status(200).json({ results });
  }
  