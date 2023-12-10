// pages/api/your-api-route.js (e.g., pages/api/marketing/profit.js)
import Cors from 'cors';
import initMiddleware from '../../../lib/init-middleware';
import { PrismaClient } from '@prisma/client';
import { parse, format } from 'date-fns';

const prisma = new PrismaClient();

// Initialize the cors middleware
const cors = initMiddleware(
  Cors({
    // Only allow requests with GET, POST, and OPTIONS
    methods: ['GET', 'POST', 'OPTIONS'],
    // Optional: Configure the allowed origins or set it to true to allow any origin
    origin: true,
  })
);


export default async function handler(req, res) {
  await cors(req, res);
  if (req.method === 'GET') {
    let { start_date, end_date } = req.query;

    // Adjust the format of start_date and end_date
    if (start_date) {
      const parsedStartDate = parse(start_date, 'MM/dd/yyyy', new Date());
      start_date = format(parsedStartDate, 'yyyy-MM-dd');
    }

    if (end_date) {
      const parsedEndDate = parse(end_date, 'MM/dd/yyyy', new Date());
      end_date = format(parsedEndDate, 'yyyy-MM-dd');
    }

    try {
      const data = await prisma.dailyProfit.findMany({
        where: {
          order_date_formatted: {
            gte: new Date(start_date).toISOString(),
            lte: new Date(end_date).toISOString()
          }
        }
      });

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    // Handle other HTTP methods
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
