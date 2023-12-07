// pages/api/shopify.js
import axios from 'axios';
import fetch from 'node-fetch';
import ndjson from 'ndjson';

function convertEgyptTimeToUTC(dateString) {
    // Parse the date string
    const date = new Date(dateString);
  
    // Egypt is UTC+2, so subtract 2 hours to convert to UTC
    date.setHours(date.getHours() + 2);
  
    return date.toISOString();
  }
  

  

async function startBulkOperation(accessToken, storeDomain, startDate, endDate) {
    const startDateUTC = convertEgyptTimeToUTC(startDate);
    const endDateUTC = convertEgyptTimeToUTC(endDate);
  const query = `
    {
      orders(query: "created_at:>=${startDateUTC} AND created_at:<=${endDateUTC}") {
        edges {
          node {
            id
            createdAt
            displayFinancialStatus
            name
            lineItems(first: 250) {
              edges {
                node {
                  discountedUnitPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const mutation = `
    mutation {
      bulkOperationRunQuery(query: """${query}""") {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await axios.post(
    `https://${storeDomain}/admin/api/2023-01/graphql.json`,
    { query: mutation },
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.data.bulkOperationRunQuery;
}

async function pollBulkOperationStatus(accessToken, storeDomain, operationId) {
  let status;
  let response;
  do {
    response = await axios.post(
      `https://${storeDomain}/admin/api/2023-01/graphql.json`,
      {
        query: `
          {
            currentBulkOperation {
              id
              status
              errorCode
              objectCount
              fileSize
              url
              partialDataUrl
            }
          }
        `,
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    status = response.data.data.currentBulkOperation.status;
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 seconds
  } while (status !== 'COMPLETED');

  return response.data.data.currentBulkOperation;
}


async function fetchAndProcessResults(resultsUrl) {
    const response = await fetch(resultsUrl);
    const stream = response.body.pipe(ndjson.parse());
  
    const orders = {};

    const processedIds = new Set(); 
  
    for await (const data of stream) {
        const id = data.id || data.__parentId; // Determine the appropriate ID field

        if (!processedIds.has(id)) {
            console.log(processedIds);
            processedIds.add(id); // Add ID to the Set

            if (data.id) {
                // This is an order object
                orders[data.id] = {
                createdAt: data.createdAt,
                lineItems: []
                };
            } else if (data.__parentId && data.discountedUnitPriceSet) {
                // This is a line item associated with an order
                const amount = data.discountedUnitPriceSet.shopMoney.amount;
                if (orders[data.__parentId]) {
                orders[data.__parentId].lineItems.push({
                    amount: amount
                });
                }
            }
     }
    }
  
    // Aggregate the data as needed
    const aggregatedData = aggregateOrderData(orders);
    return aggregatedData;
  }

  function aggregateOrderData(orders) {
    const aggregatedData = {orders:[]};
  
    for (const [orderId, order] of Object.entries(orders)) {
      const orderDate = new Date(order.createdAt);
      const formattedDate = orderDate.toLocaleDateString('en-GB'); // format as day/month/year
    
      if (!aggregatedData[formattedDate]) {
        console.log(aggregatedData[formattedDate]);
        aggregatedData[formattedDate] = {
          orderCount: 0,
          totalAmount: 0
        };
      }
  
      const totalAmountForOrder = order.lineItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
      aggregatedData[formattedDate].orderCount += 1;
      aggregatedData[formattedDate].totalAmount += totalAmountForOrder;
        aggregatedData.orders.push(orders);
    }
  
    return aggregatedData;
  }

export default async function handler(req, res) {
    if (req.method === 'POST') {
      const { startDate, endDate } = req.body;
      const accessToken = `${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN}`;
      const storeDomain = 'best-brands-in-egypt.myshopify.com';
  
      try {
        const bulkOperationResponse = await startBulkOperation(accessToken, storeDomain, startDate, endDate);
        
        if (bulkOperationResponse.userErrors.length > 0) {
          return res.status(400).json({ error: bulkOperationResponse.userErrors });
        }
  
        const operationStatus = await pollBulkOperationStatus(accessToken, storeDomain, bulkOperationResponse.bulkOperation.id);
        
        if (operationStatus.url) {
          const aggregatedData = await fetchAndProcessResults(operationStatus.url);
          res.status(200).json(aggregatedData);
        } else {
          res.status(500).json({ error: 'Bulk operation did not return a valid URL' });
        }
      } catch (error) {
        console.error('Shopify API error:', error);
        res.status(500).json({ error: 'Error communicating with Shopify API', details: error });
      }
    } else {
      res.status(405).end(); // Method Not Allowed
    }
  }
  