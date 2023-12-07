// pages/api/shopify.js
import axios from 'axios';

async function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}


export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { startDate, endDate } = req.body;
    let hasNextPage = true;
    let lastCursor = null;
    let aggregatedData = {};
    // Cairo Timezone Offset is UTC+2
    const timezoneOffset = 120; // 2 hours in minutes

    // Convert Cairo local dates to UTC
    const startUTC = new Date(new Date(startDate).getTime() - (timezoneOffset * 60000)).toISOString();
    const endUTC = new Date(new Date(endDate).getTime() - (timezoneOffset * 60000)).toISOString();

    while (hasNextPage) {
      const query = `
        {
          orders(first: 1, query: "created_at:>='${startUTC}' AND created_at:<'${endUTC}'", after: ${lastCursor ? `"${lastCursor}"` : null}) {
            edges {
              cursor
              node {
                createdAt
                id
                name
                displayFinancialStatus
                lineItems(first: 10) {
                  edges {
                    node {
                      title
                      quantity
                      discountedUnitPriceSet{
                        shopMoney {
                            amount
                          }
                        }
                    originalTotalSet{
                        shopMoney {
                            amount
                            }
                        }


                    }
                  }
                }
                
                totalPriceSet {
                  shopMoney {
                    amount
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      `;

      try {
        const response = await axios({
          url: `https://best-brands-in-egypt.myshopify.com/admin/api/2023-01/graphql.json`,
          method: 'post',
          headers: {
            'X-Shopify-Access-Token': `${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          data: {
            query: query,
          },
        });


        if (!response.data || !response.data.data || !response.data.data.orders) {
            console.log('No orders data in response:', response.data);
            res.status(200).json({ message: 'No orders found or unexpected response format' });
            return;
          }

        const orders = response.data.data.orders.edges;
        const pageInfo = response.data.data.orders.pageInfo;
        hasNextPage = pageInfo.hasNextPage;



        if (!orders.length) {
          break; // No more orders to process
        }

        // Process and aggregate the data
        orders.forEach(order => {
            console.log(order.node.displayFinancialStatus);
        //if(order.node.displayFinancialStatus != "VOIDED"){
            const date = new Date(order.node.createdAt);
            const formattedDate = date.toLocaleDateString('en-GB'); // format as day/month/year
  
            if (!aggregatedData[formattedDate]) {
              aggregatedData[formattedDate] = { count: 0, totalSales: 0, discountedSale:0, costProduct:0 };
            }
  
            aggregatedData[formattedDate].count++;
            
  //          aggregatedData[formattedDate].order.push(order);
            order.node.lineItems.edges.forEach(lineItem => {
            //     aggregatedData[formattedDate].lineItems.push({
            //     title: lineItem.node.title,
            //     quantity: lineItem.node.quantity,
            //     total: parseFloat(lineItem.node.discountedUnitPriceSet.shopMoney.amount)
            //   });
                aggregatedData[formattedDate].totalSales += parseFloat(lineItem.node.originalTotalSet.shopMoney.amount);
                aggregatedData[formattedDate].discountedSale += parseFloat(lineItem.node.discountedUnitPriceSet.shopMoney.amount);

            });
       // }

        });

        lastCursor = orders[orders.length - 1].cursor;

        // Check throttle status
        const throttleStatus = response.headers['x-shopify-shop-api-call-limit'];
        if (throttleStatus) {
          const [usedCalls, maxCalls] = throttleStatus.split('/').map(Number);
          if (usedCalls > maxCalls * 0.8) { // If more than 80% of the rate limit is used
            console.log('Approaching rate limit. Waiting before next request...');
            await delay(10000); // Wait for 10 seconds
          }
        }

      } catch (error) {
        if (error.response && error.response.data.errors) {
          const isThrottled = error.response.data.errors.some(e => e.message === 'Throttled');
          if (isThrottled) {
            console.log('Request was throttled. Waiting before retrying...');
            await delay(100000); // Wait for 10 seconds and retry the same request
            continue;
          }
        }
        console.error('Shopify API error:', error.response ? error.response.data : error);
        res.status(500).json({ error: 'Error fetching data from Shopify', details: error.response ? error.response.data : null });
        return;
      }
    }

    res.status(200).json(aggregatedData);
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
