import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

interface CatalogEntry {
  url: string;
  name: string;
  imageUrl: string | null;
  description: string;
  listPrice: number | null;
}

// Prova più percorsi possibili dove Vercel mette il file JSON bundlato
function loadCatalog(): Record<string, CatalogEntry> {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), 'blak-catalog.json'),
    join(process.cwd(), 'api', 'blak-catalog.json'),
    join(process.cwd(), 'blak-catalog.json'),
    '/var/task/api/blak-catalog.json',
    '/var/task/blak-catalog.json',
  ];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, 'utf-8');
      const result = (JSON.parse(raw) as { catalog: Record<string, CatalogEntry> }).catalog ?? {};
      console.log(`[catalog] loaded ${Object.keys(result).length} articoli da ${p}`);
      return result;
    } catch { /* prova il prossimo */ }
  }
  console.error('[catalog] non trovato in nessun percorso, cwd=', process.cwd());
  return {};
}

const BLAK_CATALOG_DATA = loadCatalog();

function ogMeta(html: string, prop: string): string {
  const a = html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`, 'i'));
  if (a) return a[1];
  const b = html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property="${prop}"`, 'i'));
  return b?.[1] ?? '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
}

// Colori ordinati per frequenza nel catalogo (più comuni prima = probe più veloce)
const BLAK_COLORS = [
  '0000','1524','1977','1512','1832','1042','1158','1645','1648','1948',
  '1415','1745','1050','1847','1845','1370','1905','1811','1732','2539',
  '1404','2513','1030','1736','1149','1800','1804','1417','1147','1503',
  '1900','1210','1514','1456','1168','1517','1051','1741','1126','1737',
  '1516','1917','1330','2003','1344','1812','2763','1743','1110','1734',
  '1987','3900','3909','1084','1458','1418','1405','1453','1457','1452',
  '1022','1762','1310','1135','1152','1190','1032','1029','1035','1974',
  '1013','2526','1744','2547','1203','7124','1010','1000','2000','2005',
  '1764','1052','1707','1166','1831','4003','4001','1024','2817','1761',
  '1106','9018','1534','1095','1099','1716','3930','3940','3910','1083',
  '1085','1086','1087','1098','1088','1101','1102','1104','1105','1860',
  '1459','1474','1460','1461','1462','1403','1465','1423','1454','1455',
  '1406','1412','1468','1469','1470','1471','1476','1472','1473','1407',
  '1408','1409','1421','1411','1422','1729','2517','1501','1380','1131',
  '1504','1515','1817','1009','1040','1157','1011','1048','1650','1063',
  '2533','1169','2955','2516','2030','2032','1006','1207','1202','1933',
  '2514','1642','1830','1079','1141','1513','2538','1075','1043','1644',
  '1343','1560','2536','2528','1835','1059','1519','2117','1532','2524',
  '1053','2510','1146','2537','1070','1451','1946','1733','1706','1705',
  '2022','1916','1025','1142','2560','2120','1077','2122','2512','1074',
  '1658','1350','2870','1108','0050','2800','1725','1153','1073','1416',
  '1100','1049','1921','1071','1140','1145','1649','1033','1450','1413',
  '2502','2802','1037','1107','1918','2954','2532','1911','2515',
];

interface ProductResult {
  url: string;
  imageUrl: string | null;
  description: string;
  title: string;
  listPrice: number | null;
}

type AnyObj = Record<string, unknown>;

/** Cerca nel __NEXT_DATA__ il prodotto con partNo che inizia con articleCode */
function findProductInNextData(html: string, articleCode: string, baseUrl: string): ProductResult | null {
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nextMatch) return null;
  try {
    const data = JSON.parse(nextMatch[1]) as AnyObj;
    const found: ProductResult[] = [];

    function traverse(obj: unknown, depth = 0): void {
      if (depth > 18 || !obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(v => traverse(v, depth + 1)); return; }
      const o = obj as AnyObj;
      const partNo = String(o.partNo ?? '');
      // Match: partNo inizia con il codice articolo E ha nome e uniqueName
      if (
        partNo &&
        partNo.toLowerCase().startsWith(articleCode.toLowerCase()) &&
        typeof o.name === 'string' && o.name &&
        typeof o.uniqueName === 'string' && o.uniqueName
      ) {
        // Immagine: prova imageUrl, poi variants[0].imageUrl, poi null
        let imageUrl: string | null = null;
        if (typeof o.imageUrl === 'string' && o.imageUrl) {
          imageUrl = o.imageUrl;
        } else if (Array.isArray(o.variants)) {
          const firstWithImg = (o.variants as AnyObj[]).find(v => typeof v.imageUrl === 'string' && v.imageUrl);
          if (firstWithImg) imageUrl = firstWithImg.imageUrl as string;
        }

        // Prezzo lordo: priceIncVat dal prodotto o dalla prima variante
        let listPrice: number | null = null;
        if (typeof o.priceIncVat === 'number' && o.priceIncVat > 0) {
          listPrice = o.priceIncVat;
        } else if (Array.isArray(o.variants)) {
          const v0 = (o.variants as AnyObj[]).find(v => typeof v.priceIncVat === 'number' && (v.priceIncVat as number) > 0);
          if (v0) listPrice = v0.priceIncVat as number;
        }

        found.push({
          url: `${baseUrl}/it/prodotto/${o.uniqueName}`,
          imageUrl,
          description: typeof o.description === 'string' ? o.description : '',
          title: o.name,
          listPrice,
        });
      }
      Object.values(o).forEach(v => traverse(v, depth + 1));
    }

    traverse(data);
    return found[0] ?? null;
  } catch {
    return null;
  }
}

export default async function handler(
  req: { method: string; query: Record<string, string | string[]>; headers: Record<string, string> },
  res: {
    status: (c: number) => { json: (d: unknown) => void };
    setHeader: (n: string, v: string) => void;
    json: (d: unknown) => void;
    end: () => void;
  }
) {
  const origin = req.headers['origin'] || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).json({}); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const code = String(req.query.code ?? '').trim();
  if (!code) { res.status(400).json({ error: 'Parametro code mancante' }); return; }

  const domain    = String(req.query.domain    ?? 'www.blaklader.it');
  const manualUrl = String(req.query.searchUrl ?? '');
  const baseUrl   = domain.startsWith('http') ? domain : `https://${domain}`;

  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const hdrs = { 'User-Agent': ua, 'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8', 'Accept': 'text/html,application/xhtml+xml' };

  // Normalizza il codice: estrae solo le cifre, poi prende le prime 4
  // Gestisce formati come "4.499", "4499-BLU", "4499 1516", "BLK-4499", ecc.
  const digits = code.replace(/\D/g, '');
  const articleCode = digits.slice(0, 4);

  try {
    // --- LOOKUP nel catalogo statico bundlato (440 articoli) ---
    if (!manualUrl && domain.includes('blaklader')) {
      const entry = BLAK_CATALOG_DATA[articleCode];
      if (entry) {
        res.json({
          url: entry.url,
          imageUrl: entry.imageUrl,
          description: entry.description,
          title: entry.name,
          listPrice: entry.listPrice,
        });
        return;
      }
    }

    // --- URL fornito manualmente ---
    if (manualUrl) {
      const r = await fetch(manualUrl, { headers: hdrs });
      if (!r.ok) { res.status(502).json({ error: `HTTP ${r.status}` }); return; }
      const html = await r.text();
      const fromData = findProductInNextData(html, articleCode, baseUrl);
      if (fromData) { res.json(fromData); return; }
      res.json({
        url: manualUrl,
        imageUrl: ogMeta(html, 'og:image') || null,
        description: decodeEntities(ogMeta(html, 'og:description')),
        title: decodeEntities(ogMeta(html, 'og:title')),
        listPrice: null,
      });
      return;
    }

    if (!domain.includes('blaklader')) {
      res.status(400).json({ error: 'Configura il dominio del sito prodotti nelle Impostazioni.' });
      return;
    }

    // --- STRATEGIA 1: listing page via redirect da codice articolo solo ---
    // GET /it/prodotto/{articleCode} → 302 → listing page con __NEXT_DATA__ prodotti
    const articleUrl = `${baseUrl}/it/prodotto/${articleCode}`;
    let listingPageUrl: string | null = null;
    try {
      const r = await fetch(articleUrl, { method: 'GET', headers: hdrs, redirect: 'manual' });
      const loc = r.headers.get('location') ?? '';
      if ((r.status === 301 || r.status === 302) && loc) {
        listingPageUrl = loc.startsWith('http') ? loc : `${baseUrl}${loc}`;
      }
    } catch { /* ignora */ }

    if (listingPageUrl) {
      const rListing = await fetch(listingPageUrl, { headers: hdrs, signal: AbortSignal.timeout(5000) }).catch(() => null);
      if (rListing?.ok) {
        const html = await rListing.text();
        const fromListing = findProductInNextData(html, articleCode, baseUrl);
        if (fromListing) {
          if (!fromListing.imageUrl) fromListing.imageUrl = ogMeta(html, 'og:image') || null;
          res.json(fromListing);
          return;
        }
      }
    }

    // --- STRATEGIA 2: color probe con abort-on-first-hit (race pattern) ---
    let directProductUrl: string | null = null;
    let listingFallbackUrl: string | null = listingPageUrl;

    // Race: torna non appena troviamo un URL diretto, max 12s totali
    const abort = new AbortController();
    const globalTimeout = setTimeout(() => abort.abort(), 12000);

    await Promise.allSettled(BLAK_COLORS.map(async (color) => {
      const testUrl = `${baseUrl}/it/prodotto/${articleCode}${color}`;
      try {
        const r = await fetch(testUrl, { method: 'HEAD', headers: hdrs, redirect: 'manual', signal: abort.signal });
        if (r.status === 301 || r.status === 302) {
          const loc = r.headers.get('location') ?? '';
          const fullLoc = loc.startsWith('http') ? loc : `${baseUrl}${loc}`;
          if (loc.includes('/it/prodotto/') && !loc.includes('/tutti-i-prodotti')) {
            if (!directProductUrl) {
              directProductUrl = fullLoc;
              abort.abort(); // cancella le probe rimanenti, risparmia tempo
            }
          } else if (!listingFallbackUrl && loc.includes('/tutti-i-prodotti')) {
            listingFallbackUrl = fullLoc;
          }
        }
      } catch { /* abort o errore = normale */ }
    }));

    clearTimeout(globalTimeout);

    // --- Recupera dati dalla pagina prodotto diretta ---
    if (directProductUrl) {
      const r2 = await fetch(directProductUrl, { headers: hdrs });
      if (r2.ok) {
        const html = await r2.text();
        const fromData = findProductInNextData(html, articleCode, baseUrl);
        if (fromData) {
          // OG image come fallback se __NEXT_DATA__ non ha imageUrl
          if (!fromData.imageUrl) fromData.imageUrl = ogMeta(html, 'og:image') || null;
          res.json(fromData);
          return;
        }
        // Fallback OG puro
        res.json({
          url: directProductUrl,
          imageUrl: ogMeta(html, 'og:image') || null,
          description: decodeEntities(ogMeta(html, 'og:description')),
          title: decodeEntities(ogMeta(html, 'og:title')),
          listPrice: null,
        });
        return;
      }
    }

    // --- Fallback listing page con __NEXT_DATA__ ---
    if (listingFallbackUrl && listingFallbackUrl !== listingPageUrl) {
      const r3 = await fetch(listingFallbackUrl, { headers: hdrs });
      if (r3.ok) {
        const html = await r3.text();
        const fromListing = findProductInNextData(html, articleCode, baseUrl);
        if (fromListing) { res.json(fromListing); return; }
      }
    }

    res.status(404).json({
      error: `Prodotto "${articleCode}" non trovato su ${domain}. Puoi incollare manualmente l'URL della pagina prodotto.`
    });

  } catch (err) {
    console.error('[blaklader-enrich]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Errore interno' });
  }
}
