// pages/api/fetchAds.js
import { PrismaClient } from '@prisma/client';
import { Ad, FacebookAdsApi } from 'facebook-nodejs-business-sdk';

const prisma = new PrismaClient();

function formatToISODateTime(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date.toISOString();
  }

export default async function handler(req, res) {
  // Initialize the Facebook SDK
  const accessToken = process.env.FB_ACCESS_TOKEN_GNYUS;
  FacebookAdsApi.init(accessToken);

  let adData;
  let adIdArray;
  let dateRange;

  try {
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

    const fields = [
        'optimization_goal',
        'clicks',
        'ad_id',
        'ad_name',
        'inline_post_engagement',
        'cost_per_inline_post_engagement',
        'objective',
        'reach',
        'wish_bid',
        'cpc',
        'ctr',
        'cpm',
        'spend',
        'date_start',
        'date_stop'
      ];
  
      let adsData = [];
  
      for (const adId of adIdArray) {
        const ad = new Ad(adId);
        const adInsights = await ad.getInsights(
          fields,
          {
            time_range: dateRange
          }
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
      
  
            await prisma.engagement_ad_data.create({
                data: {
                  optimization_goal: adData.optimization_goal,
                  clicks: parseInt(adData.clicks, 10),
                  ad_id: adData.ad_id,
                  ad_name: adData.ad_name,
                  inline_post_engagement: parseInt(adData.inline_post_engagement, 10),
                  cost_per_inline_post_engagement: parseFloat(adData.cost_per_inline_post_engagement),
                  objective: adData.objective,
                  reach: parseInt(adData.reach, 10),
                  wish_bid: parseFloat(adData.wish_bid),
                  cpc: parseFloat(adData.cpc),
                  ctr: parseFloat(adData.ctr),
                  cpm: parseFloat(adData.cpm),
                  spend: parseFloat(adData.spend),
                  date_start: formattedDateStart,
                  date_stop: formattedDateStop
                }
              });
        }
      }
    }

    res.status(200).json(adsData);
} catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (req.method === 'POST') {
      await prisma.$disconnect();
    }
  }
}
