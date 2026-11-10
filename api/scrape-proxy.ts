import { requireUser } from './_auth.js';
import { applyCors } from './cors.js';
import { safeFetch, UnsafeUrlError } from './_safeFetch.js';
export default async function handler(
  req: { method: string; query: Record<string, string | string[] | undefined>; headers: Record<string, string> },
  res: {
    status: (code: number) => {
      json: (body: unknown) => void;
      send: (body: string) => void;
      end: () => void;
    };
    setHeader: (name: string, value: string) => void;
  }
) {
  if (req.method === 'OPTIONS') { applyCors(req, res); return res.status(200).end(); }
  applyCors(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!await requireUser(req, res)) return;

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!rawUrl) return res.status(400).json({ error: 'Missing url param' });

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(rawUrl);
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;
    new URL(targetUrl); // validate
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    // safeFetch blocca indirizzi privati/interni sull'IP risolto e ricontrolla ogni redirect
    const response = await safeFetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Target returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return res.status(415).json({ error: 'URL non è una pagina HTML' });
    }

    const html = await response.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err: any) {
    if (err instanceof UnsafeUrlError) return res.status(403).json({ error: err.message });
    const msg = err?.name === 'TimeoutError' ? 'Timeout raggiungendo il sito' : 'Impossibile raggiungere il sito';
    return res.status(502).json({ error: msg });
  }
}
