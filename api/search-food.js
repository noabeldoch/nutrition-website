export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { q } = req.body || {};
  if (!q || typeof q !== 'string' || q.trim().length < 2) return res.status(400).json({ error: 'A search query is required' });
  try {
    const response = await fetch('https://search.openfoodfacts.org/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: q.trim(), page: 1, page_size: 20, langs: ['he', 'en'], fields: ['code', 'product_name', 'product_name_he', 'brands', 'nutriments'] })
    });
    const body = await response.text();
    if (!response.ok) return res.status(502).send(body);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(body);
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'Unable to reach food database' });
  }
}
