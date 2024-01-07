import axios from 'axios';
import { Pool } from 'pg';
import fs from 'fs';

// Assuming the CA certificate is located at './path/to/your/ca-certificate.crt'
const caCertificate = fs.readFileSync('./ca/ca-certificate.crt').toString();

// PostgreSQL pool with SSL configuration
const pool = new Pool({
  user: 'doadmin',
  host: 'giftsny-nyc3-db-do-user-14097277-0.c.db.ondigitalocean.com',
  database: 'defaultdb',
  password: `${process.env.ORDERS_DB_PASSWORD}`,
  port: 25060,
  ssl: {
    rejectUnauthorized: true, // Set to false if you don't want to verify the server's cert against the CA
    ca: caCertificate // CA certificate
  }
});

export default async function handler(req, res) {
    if (req.method === 'GET') {
      const { orderId, shop } = req.query;
      const api = `${process.env.API_DOMAIN}` || 'http://app.giftsny.com'
      
      const fullUrl = `${api}/api/sales/order-id?orderId=${orderId}&shop=${shop}`;
      console.log(fullUrl)
      const client = await pool.connect();
      try {
        // Set up headers for the fetch call
        // Extract Cookie header from the incoming request
        const cookie = req.headers.cookie;

        // Set up headers for the fetch call, including the extracted Cookie
        const headers = {
          'Content-Type': 'application/json',
          'Cookie': cookie // Use the extracted Cookie here
        };
  
        // Fetch data from the external API using fetch
        const response = await fetch(fullUrl, { headers });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const orderData = await response.json();
  
        // Insert data into PostgreSQL
        
        const insertQuery = 'INSERT INTO orders (id, data, shop_name) VALUES ($1, $2, $3)';
        await client.query(insertQuery, [orderData.id, orderData, shop]);
        client.release();
  
        res.status(200).json({ message: 'Order data stored successfully.' });
      } catch (error) {
        client.release();
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }