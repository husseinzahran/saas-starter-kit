// pages/api/updateOrderStatus.js

import { Client } from 'pg';

import fs from 'fs';
const caCertificate = fs.readFileSync('./ca/ca-certificate.crt').toString();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { orderId, status } = req.query;

    // Replace these with your actual database connection details
    const dbConfig = {
        user: 'doadmin',
        host: 'giftsny-nyc3-db-do-user-14097277-0.c.db.ondigitalocean.com',
        database: 'defaultdb',
        password: `${process.env.ORDERS_DB_PASSWORD}`,
        port: 25060,
        ssl: {
          rejectUnauthorized: true, // Set to false if you don't want to verify the server's cert against the CA
          ca: caCertificate // CA certificate
        }
    };

    const client = new Client(dbConfig);

    try {
      await client.connect();

      // Update the order status in the database
      const updateQuery = `
        UPDATE orders
        SET order_status = $1
        WHERE id = $2
      `;
      await client.query(updateQuery, [status, orderId]);

      await client.end();

      console.log(`Order ${orderId} updated to ${status}`);
      res.status(200).json({ message: `Order ${orderId} updated to ${status}` });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
