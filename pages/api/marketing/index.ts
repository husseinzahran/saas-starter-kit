import { FacebookAdsApi, Campaign } from 'facebook-nodejs-business-sdk';
import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient();

//const prisma = new PrismaClient();

async function fetchCampaignInsights(campaignIds, startDate, endDate) {
  FacebookAdsApi.init(process.env.FB_ACCESS_TOKEN);
  //const account = new AdAccount(process.env.FB_AD_ACCOUNT_ID);

  return Promise.all(campaignIds.map(async (campaignId) => {
      const campaign = new Campaign(campaignId);
      const insightsData = await campaign.getInsights(['campaign_name','cpm', 'cpp', 'spend', 'website_purchase_roas','website_ctr'], {
          time_range: { 'since': startDate, 'until': endDate }
      });
      return {
          id: campaignId,
          insights: insightsData,
      };
  }));
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {

          // Retrieve start_date and end_date from the query parameters
          const { start_date, end_date } = req.query;

          // Validate the dates
          if (!start_date || !end_date) {
              return res.status(400).json({ error: 'start_date and end_date are required' });
          }
            
          const campaignIds = ['120201685256890557']; // Your predefined list of campaign IDs
          const campaignInsights = await fetchCampaignInsights(campaignIds, start_date, end_date);

          res.status(200).json(campaignInsights);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'POST') {
      const { start_date, end_date } = req.body;


      // Validation for start_date and end_date

      const campaignIds = ['120201685256890557']; // Replace with your campaign IDs
      const campaignInsights = await fetchCampaignInsights(campaignIds, start_date, end_date);

      console.log(campaignInsights)

      for (const { id, insights } of campaignInsights) {
          for (const insight of insights) {
              const existingRecord = await prisma.marketing_cost.findFirst({
                  where: {
                      campaign_id: id,
                      campaign_date: new Date(start_date)                  }
              });

              if (existingRecord) {
                await prisma.marketing_cost.updateMany({
                  where: {
                    campaign_id: id,
                    campaign_date: new Date(start_date)                  },
                  data: {
                      cpm: insight.cpm,
                      cpp: insight.cpp,
                      amount_spent: insight.spend,
                      roas: 0,
                      campaign_name: insight.campaign_name
                  }
              });
              } else {
                  await prisma.marketing_cost.create({
                      data: {
                          campaign_id: id,
                          cpm: insight.cpm,
                          cpp: insight.cpp,
                          amount_spent: insight.spend,
                          campaign_date: new Date(start_date),
                          roas: 0,
                          campaign_name: insight.campaign_name                      
                        }
                  });
              }
          }
      }

      res.status(200).json({ message: 'Data processed and stored successfully' })}
     else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
