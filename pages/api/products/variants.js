// pages/api/products.js
export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { vendorName } = req.query;

        if (!vendorName) {
            return res.status(400).json({ error: 'Vendor name is required' });
        }

        try {
            const shopName = 'best-brands-in-egypt';
            const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

            const response = await fetch(`https://${shopName}.myshopify.com/admin/api/2023-04/products.json?vendor=${vendorName}&limit=250`, {
                method: 'GET',
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            const products = data.products || [];

            // Extract variant IDs and SKUs
            const variants = products.flatMap(product => product.variants.map(variant => ({
                id: variant.id,
                sku: variant.sku
            })));

            res.status(200).json(variants);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}