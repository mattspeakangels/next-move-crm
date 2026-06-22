export function blakladerUrl(code: string, productUrl?: string): string {
  if (productUrl) return productUrl;
  return `https://www.blaklader.it/?s=${encodeURIComponent(code.trim())}`;
}

export async function enrichProduct(code: string): Promise<{
  url: string;
  imageUrl: string | null;
  description: string;
  title: string;
  listPrice: number | null;
} | null> {
  try {
    const url = `/api/blaklader-enrich?code=${encodeURIComponent(code)}`;
    console.log(`[enrich] richiesta: code="${code}" → ${url}`);
    const res = await fetch(url);
    console.log(`[enrich] risposta: status=${res.status}, ok=${res.ok}`);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn(`[enrich] FALLITO code="${code}": HTTP ${res.status}`, errBody);
      return null;
    }
    const data = await res.json();
    console.log(`[enrich] SUCCESSO code="${code}":`, data.title, '| listPrice:', data.listPrice, '| imageUrl:', data.imageUrl ? 'sì' : 'no');
    return data;
  } catch (err) {
    console.error(`[enrich] ERRORE code="${code}":`, err);
    return null;
  }
}
