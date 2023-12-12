// pages/api/updateAdCreative.js

import { FacebookAdsApi, AdCreative } from 'facebook-nodejs-business-sdk';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { adId, instagramPostId } = req.body;

        try {
            // Initialize the Facebook SDK
            const accessToken = process.env.FB_ACCESS_TOKEN_HUSHY; // Store your access token in environment variables
            FacebookAdsApi.init(accessToken);

            // Update the ad creative
            const updatedCreative = await updateAdCreative(adId, instagramPostId);
            res.status(200).json({ success: true, updatedCreative });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    } else {
        // Handle any non-POST requests
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function updateAdCreative(adId, instagramPostId) {
    const adCreative = new AdCreative("120202681180300644");
    return adCreative.update({
        'effective_object_story_id': "17841460118689604_3255546564263637983"
    });
}
