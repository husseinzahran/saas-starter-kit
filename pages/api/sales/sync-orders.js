// File: pages/api/processOrders.js

export default async function handler(req, res) {
    // Assuming you get order IDs from the request body or query
      
    const orderIds = req.body.orderIds || [];
    const shop = req.body.shop;
    const api = `${process.env.API_DOMAIN}` || 'http://app.giftsny.com'

    async function callExternalApi(orderId) {
      const url = `${api}/api/sales/store-order?orderId=${orderId}&shop=${shop}`;
  
      const headers = {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.csrf-token=1b93352439d8f29b030e0dcb47f4f3f45e7a3fa3730d5dfb8b0dd223095e84c6%7C2d4cd20331a9f0870ca56e3d99b576594f3f7fda4397ab721e4ce9670aa1fc0e; next-auth.callback-url=http%3A%2F%2Flocalhost%3A4002%2Fdashboard; next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..CVtLtMTu8woZsunV.1PPhSm17Lrw8CcrVfH5rfrQoIwhVt9ZotF337XHtuYDEge9M2UcdtZLU40FiE-dr_ySQOJrgFT_IrEGpgweqMA_xyiallt80_KGCWauZKPV25d-ZIFq4alB1HbQEdApXyIxsnO3axoaj3RXuFJGjvkDaR-rp0NQIVCP7JlXV4OGS0BRiAnWkIKY3hHq7PlHAPtz4oGJCuSoVdqTtpmOL3Do_7NMZoFMqtTK0uYLR2jjAUg.oodwHkVzcvaNV7X7UED6Eg'
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
  