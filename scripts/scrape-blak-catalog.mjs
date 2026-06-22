/**
 * Scraper catalogo Blåkläder IT — via sitemap
 * Uso: node scripts/scrape-blak-catalog.mjs
 * Output: public/blak-catalog.json
 *
 * 1. Legge tutti i prodotti dal sitemap italiano (1252 URL)
 * 2. Raggruppa per codice articolo (4 cifre)
 * 3. Fetcha le pagine prodotto in batch per estrarre imageUrl e prezzo lordo
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://www.blaklader.it';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BATCH_SIZE = 12;   // richieste parallele
const BATCH_DELAY = 800; // ms tra i batch

const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

/** Estrae dati prodotto dal __NEXT_DATA__ cercando il partNo che inizia con articleCode */
function extractProductData(html, articleCode) {
  const data = extractNextData(html);
  if (!data) return null;

  const found = [];
  const jsonStr = JSON.stringify(data);

  function traverse(obj, depth = 0) {
    if (depth > 20 || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(v => traverse(v, depth + 1)); return; }

    const pn = String(obj.partNo ?? '');
    const nm = typeof obj.name === 'string' ? obj.name : '';
    const un = typeof obj.uniqueName === 'string' ? obj.uniqueName : '';

    if (pn && pn.startsWith(articleCode) && nm && un) {
      let imageUrl = null;
      if (typeof obj.imageUrl === 'string' && obj.imageUrl) {
        imageUrl = obj.imageUrl;
      } else if (Array.isArray(obj.variants)) {
        const v = obj.variants.find(v => typeof v.imageUrl === 'string' && v.imageUrl);
        if (v) imageUrl = v.imageUrl;
      }

      let listPrice = null;
      if (typeof obj.priceIncVat === 'number' && obj.priceIncVat > 0) {
        listPrice = obj.priceIncVat;
      } else if (Array.isArray(obj.variants)) {
        const v = obj.variants.find(v => typeof v.priceIncVat === 'number' && v.priceIncVat > 0);
        if (v) listPrice = v.priceIncVat;
      }

      found.push({ name: nm, imageUrl, listPrice, description: typeof obj.description === 'string' ? obj.description : '' });
    }

    Object.values(obj).forEach(v => traverse(v, depth + 1));
  }

  traverse(data);
  return found[0] ?? null;
}

/** Fetcha una pagina prodotto ed estrae i dati */
async function fetchProductPage(url, articleCode) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'it-IT,it;q=0.9', Accept: 'text/html' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const html = await r.text();
    return extractProductData(html, articleCode);
  } catch {
    return null;
  }
}

async function main() {
  // === STEP 1: Carica sitemap ===
  console.log('1. Scarico sitemap prodotti IT...');
  const sitemapRes = await fetch(BASE_URL + '/it/product.sitemap.xml', {
    headers: { 'User-Agent': UA }
  });
  const sitemapXml = await sitemapRes.text();

  // Estrai tutti gli URL prodotto
  const productUrls = (sitemapXml.match(/<loc>([^<]+)<\/loc>/g) ?? [])
    .map(m => m.replace(/<\/?loc>/g, ''))
    .filter(u => u.includes('/it/prodotto/'));

  console.log(`   Trovati ${productUrls.length} URL prodotto nel sitemap\n`);

  // === STEP 2: Raggruppa per codice articolo (prime 4 cifre) ===
  // URL pattern: /it/prodotto/{articleCode}{colorCode}-{slug}
  const articleMap = {}; // articleCode → {url, name, articleCode}

  for (const url of productUrls) {
    const m = url.match(/\/it\/prodotto\/(\d{4})(\d{4})-(.+)/);
    if (!m) continue;
    const [, articleCode, colorCode, slug] = m;
    if (!articleMap[articleCode]) {
      // Prima occorrenza: prendi il colore più comune (0000 se disponibile)
      articleMap[articleCode] = { url, articleCode, colorCode, slug };
    } else if (colorCode === '0000' || colorCode === '1524' || colorCode === '1977') {
      // Preferisci colori più comuni
      articleMap[articleCode] = { url, articleCode, colorCode, slug };
    }
  }

  const articles = Object.values(articleMap);
  console.log(`2. Codici articolo unici: ${articles.length}`);
  console.log(`   Fetching ${articles.length} pagine prodotto (batch di ${BATCH_SIZE})...\n`);

  // === STEP 3: Carica il catalogo esistente per non perdere dati già presenti ===
  const outPath = join(__dirname, '..', 'public', 'blak-catalog.json');
  let existingCatalog = {};
  try {
    const existing = JSON.parse(readFileSync(outPath, 'utf-8'));
    existingCatalog = existing.catalog ?? {};
    console.log(`   Catalogo esistente: ${Object.keys(existingCatalog).length} articoli (verranno aggiornati)\n`);
  } catch { console.log('   Nessun catalogo esistente, parto da zero\n'); }

  // === STEP 4: Fetch in batch ===
  const catalog = { ...existingCatalog };
  let fetched = 0;
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (article) => {
        const data = await fetchProductPage(article.url, article.articleCode);
        return { article, data };
      })
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') { failed++; continue; }
      const { article, data } = result.value;
      fetched++;

      if (data) {
        catalog[article.articleCode] = {
          url: article.url,
          name: data.name,
          imageUrl: data.imageUrl,
          description: data.description,
          listPrice: data.listPrice,
        };
        enriched++;
      } else {
        // Fallback: aggiungi solo URL e nome dal slug
        if (!catalog[article.articleCode]) {
          const name = article.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          catalog[article.articleCode] = {
            url: article.url,
            name,
            imageUrl: null,
            description: '',
            listPrice: null,
          };
        }
        failed++;
      }
    }

    const pct = Math.round((i + batch.length) / articles.length * 100);
    process.stdout.write(`\r   [${pct}%] ${i + batch.length}/${articles.length} — con dati: ${enriched}, fallback: ${failed}`);

    if (i + BATCH_SIZE < articles.length) await sleep(BATCH_DELAY);
  }

  console.log('\n');

  // === STEP 5: Statistiche e salvataggio ===
  const totalArticles = Object.keys(catalog).length;
  const withImage = Object.values(catalog).filter(p => p.imageUrl).length;
  const withPrice = Object.values(catalog).filter(p => p.listPrice).length;

  console.log('=== Risultati ===');
  console.log(`Codici articolo totali: ${totalArticles}`);
  console.log(`Con immagine:          ${withImage}`);
  console.log(`Con prezzo listino:    ${withPrice}`);
  console.log(`Senza dati (fallback): ${totalArticles - enriched}`);

  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), catalog }, null, 2));
  console.log(`\nSalvato in: ${outPath}`);
}

main().catch(console.error);
