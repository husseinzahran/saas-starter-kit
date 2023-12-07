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
      const { orderId } = req.query;
      const fullUrl = `http://localhost:4002/api/sales/order-id?orderId=${orderId}`;
  
      try {
        // Set up headers for the fetch call
        const headers = {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.csrf-token=307e3c0fb1b44a87a2ff21ef1ac5f6872e362bcbf6451b3ff89a5cce3ae6627e%7Ca1bd8a5cbc7883bf72fecb41ab3d15e626847a033ab3358cc17df1b8586a08f2; next-auth.callback-url=http%3A%2F%2Flocalhost%3A4002%2Fdashboard; next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..C1TXjXFYw6wko614.l59EqgwP_U4mW7utDsDj0YeCVjNnqf_mRovQFVDxrsJvniJzUyz_UkGRZlkDXbLOnbyxbk2MrCyKie8Q5IbAF8aZ2TFsewqnyc8v7N77AwqRhBImqxE_kt_T84_XYR9yYAzuShx7teVGPlfvrBIzMGXIq8GztVc7CejZLoK-dU1l7TozJFFyE-nUB3z5PNUfj1zGS-5Pq59MVbUJpfoGD6HARklamBOA1ECrC-uUcW-miA.c3p5JBByEWYuaUqiajSIIQ'
        };
  
        // Fetch data from the external API using fetch
        const response = await fetch(fullUrl, { headers });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const orderData = await response.json();
  
        // Insert data into PostgreSQL
        const client = await pool.connect();
        const insertQuery = 'INSERT INTO orders (id, data) VALUES ($1, $2)';
        await client.query(insertQuery, [orderData.id, orderData]);
        client.release();
  
        res.status(200).json({ message: 'Order data stored successfully.' });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }