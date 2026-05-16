export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { term, limit = '8', country = 'IL' } = req.query;
  if (!term) return res.status(400).json({ error: 'Missing term' });

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=${limit}&country=${country}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Balaganza/1.0)' },
    });
    if (!response.ok) return res.status(response.status).json({ error: 'iTunes API error' });
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Search failed', details: err.message });
  }
}
