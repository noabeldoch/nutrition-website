export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { q } = req.body || {};
  if (!q || typeof q !== 'string' || q.trim().length < 2) return res.status(400).json({ error: 'A search query is required' });

  try {
    // Use the stable Open Food Facts product search endpoint here.
    // Search-a-licious is still evolving and has had recent CORS/search issues.
    const params = new URLSearchParams({
      search_terms: q.trim(),
      search_simple: '1',
      action: 'process',
      json: '1',
      page: '1',
      page_size: '20',
      lc: 'he',
      fields: 'code,product_name,product_name_he,brands,image_url,image_front_url,image_small_url,nutriments'
    });
    const response = await fetch('https://world.openfoodfacts.org/cgi/search.pl?' + params.toString(), {
      headers: { 'User-Agent': 'NutritionWebsite/1.0 (food search)' }
    });
    const body = await response.text();
    if (!response.ok) {
      console.error('Open Food Facts search failed:', response.status, body);
      return res.status(502).send(body);
    }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(body);
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'Unable to reach food database' });
  }
}
