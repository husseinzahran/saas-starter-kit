// pages/api/update-stock.js
import formidable from 'formidable';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

async function updateInventoryItem(shopName, accessToken, inventoryItemId, quantity) {
    const makeRequest = async () => {
        const response = await fetch(`https://${shopName}.myshopify.com/admin/api/2023-04/inventory_levels/set.json`, {
            method: 'POST',
            headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                location_id: 73953313052, // Replace with your Shopify location ID
                inventory_item_id: inventoryItemId,
                available: quantity,
            }),
        });

        if (response.status === 429) { // Rate limit hit
            const retryAfter = response.headers.get('Retry-After') || 10; // Default to 10 seconds if header is missing
            console.log(`Rate limit hit, retrying after ${retryAfter} seconds`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return makeRequest(); // Retry the request
        }

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        return response.json();
    };

    return makeRequest();
}

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const form = new formidable.IncomingForm();
        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            const shopName = 'best-brands-in-egypt';
            const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
            const csvFile = files.file.filepath;

            try {
                const csvData = parse(await fs.promises.readFile(csvFile), {
                    columns: true,
                    skip_empty_lines: true,
                });

                for (const { id, quantity } of csvData) {
                    await updateInventoryItem(shopName, accessToken, id, quantity);
                }

                res.status(200).json({ message: 'Stock updated successfully' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
