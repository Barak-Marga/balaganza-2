// תמונת תצוגה מקדימה לחתונה — תמונת הזוג שהועלתה לאתר
const DB = 'https://balaganza-default-rtdb.firebaseio.com';
export default async function handler(req, res) {
  const room = String(req.query.room || '').replace(/[^A-Za-z0-9_-]/g, '');
  const fallback = () => { res.writeHead(302, { Location: '/og/og-wedding.png' }); res.end(); };
  if (!room) return fallback();
  try {
    const r = await fetch(`${DB}/events/${room}/weddingConfig/heroImage.json`);
    const v = r.ok ? await r.json() : null;
    if (!v || typeof v !== 'string') return fallback();
    if (/^https?:\/\//.test(v)) { res.writeHead(302, { Location: v }); return res.end(); }
    const m = v.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!m) return fallback();
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    return res.status(200).send(Buffer.from(m[2], 'base64'));
  } catch (e) { return fallback(); }
}
