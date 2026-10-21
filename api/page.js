import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirnameSafe = () => { try { return path.dirname(fileURLToPath(import.meta.url)); } catch (e) { return process.cwd(); } };
// מגיש את index.html עם כותרת ותמונה מותאמות לאירוע (תצוגה מקדימה בוואטסאפ / לשונית דפדפן)
const DB = 'https://balaganza-default-rtdb.firebaseio.com';

const DEFAULTS = {
  wedding: { title: 'החתונה של {בני הזוג} · Music by MARGA', desc: 'בחרו את השירים שילוו אותנו ברחבה 🎶' },
  party:   { title: '{שם האירוע} · Party Playlist · MARGA', desc: 'הוסיפו שירים לפלייליסט של המסיבה 🎧' },
  default: { title: '{שם האירוע} · בלאגנזה 🎵', desc: 'בקשו שירים והצביעו לפלייליסט של האירוע 🎶' },
};

const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function fb(path) {
  try {
    const r = await fetch(`${DB}/${path}.json`, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${host}`;
  const room = String(req.query.room || '').replace(/[^A-Za-z0-9_-]/g, '');

  // קוראים את index.html מהדיסק (לא דרך HTTP — בגרסאות בדיקה מוגנות בקשת HTTP פנימית מקבלת דף התחברות)
  let html = null;
  for (const f of [path.join(process.cwd(), 'index.html'), path.join(__dirnameSafe(), '..', 'index.html')]) {
    try { html = await readFile(f, 'utf8'); if (html && html.includes('<title>')) break; html = null; } catch (e) {}
  }
  if (!html) {
    res.writeHead(302, { Location: `/index.html?room=${encodeURIComponent(room)}` });
    return res.end();
  }

  try {
    if (room) {
      const [name, type, celebrantName, couple, archived, meta] = await Promise.all([
        fb(`events/${room}/name`), fb(`events/${room}/type`), fb(`events/${room}/celebrantName`),
        fb(`events/${room}/weddingConfig/coupleNames`), fb(`events/${room}/archived`),
        fb('config/shareMeta'),
      ]);
      if (name && !archived) {
        const kind = type === 'חתונה' ? 'wedding' : type === 'מסיבה פרטית' ? 'party' : 'default';
        const cfg = { ...DEFAULTS[kind], ...((meta && meta[kind]) || {}) };
        const coupleTxt = (couple && (couple.he || couple.en)) || celebrantName || name;
        const fill = t => String(t || '')
          .split('{שם האירוע}').join(name)
          .split('{שם}').join(celebrantName || name)
          .split('{בני הזוג}').join(coupleTxt);
        const title = fill(cfg.title) || name;
        const desc = fill(cfg.desc);
        const img = kind === 'wedding' ? `${origin}/api/og-image?room=${room}`
          : `${origin}/og/og-${kind}.png`;
        const url = `${origin}/?room=${room}`;
        const tags = `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">`;
        html = html.replace(/<title>[\s\S]*?<\/title>/, tags);
      }
    }
  } catch (e) { /* בכל תקלה — מגישים את הדף הרגיל */ }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).send(html);
}
