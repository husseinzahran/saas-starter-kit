// pages/api/fetchAdInsights.js
import { PrismaClient } from '@prisma/client';
import { Ad, FacebookAdsApi } from 'facebook-nodejs-business-sdk';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    // Initialize the Facebook SDK
    const accessToken = process.env.FB_ACCESS_TOKEN_GNYUS; // Your access token
    FacebookAdsApi.init(accessToken);

    let adsData = [];
    let adIdArray;
    let dateRange;

    if (req.method === 'GET') {
      // Extract parameters from query for GET request
      const { start_date, end_date, ad_ids } = req.query;
      if (!start_date || !end_date || !ad_ids) {
        return res.status(400).json({ error: 'Missing required query parameters' });
      }
      adIdArray = ad_ids.split(',');
      dateRange = { since: start_date, until: end_date };
    } else if (req.method === 'POST') {
      // Extract parameters from body for POST request
      const { start_date, end_date, ad_ids } = req.body;
      if (!start_date || !end_date || !ad_ids) {
        return res.status(400).json({ error: 'Missing required fields in the request body' });
      }
      adIdArray = ad_ids.split(',');
      dateRange = { since: start_date, until: end_date };
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // const adIds = req.query.ad_ids; // Ad IDs from the request query parameter as a comma-separated string
    // const startDate = req.query.start_date; // Start date from the request query parameter
    // const endDate = req.query.end_date; // End date from the request query parameter
    // const adIdArray = adIds.split(','); // Split the string into an array of Ad IDs


    const fields = ['cpm', 'reach', 'impressions', 'clicks', 'ad_id', 'ad_name','campaign_name'];
    const params = {
      time_range: dateRange,
      breakdowns: ['region']
    };

  
      for (const adId of adIdArray) {
        const ad = new Ad(adId);
        const adInsights = await ad.getInsights(
          fields,
          params
        );
        adsData.push(adInsights);
      }


      if (req.method === 'POST') {
        // Save to database for POST requests
  
        const nestedAdsArray = adsData; // Assuming this is the array of arrays structure you provided
  
        for (const adsArray of nestedAdsArray) {
          for (const adObject of adsArray) {
              const adData = adObject._data;
              // Get the current date and time in Egypt timezone
              const egyptTimeZone = 'Africa/Cairo';
  
              // Get the current date and time in the Egypt timezone for date_start
              const currentDateTimeEgypt = new Date().toLocaleString("en-US", { timeZone: egyptTimeZone });
              const formattedDateStart = new Date(currentDateTimeEgypt).toISOString();
        
              //const currentStopDateTime = new Date().toISOString();
              const estTimeZone = 'America/New_York';
              const currentDateTimeEST = new Date().toLocaleString("en-US", { timeZone: estTimeZone });
              const formattedDateStop = new Date().toISOString();
        
    
              await prisma.ad_insights_region.create({
                  data: {
                    ad_id: adData.ad_id,
                    ad_name: adData.ad_name,
                    campaign_name: adData.campaign_name,
                    region: adData.region,
                    reach: parseInt(adData.reach, 10),
                    impressions: parseInt(adData.impressions, 10),
                    clicks: parseInt(adData.clicks, 10),
                    cpm: parseFloat(adData.cpm),
                    date_eg: formattedDateStart,
                    date_est: formattedDateStop
                  }
                });
          }
        }
      }

      res.status(200).json(adsData);
    } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
