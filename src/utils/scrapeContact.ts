export interface ScrapedContact {
  company: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  zipCode: string;
  province: string;
  country: string;
  vatNumber: string;
  sector: string;
  notes: string;
}

function extractJsonLd(doc: Document): Record<string, any> | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent || '');
      const items = Array.isArray(data) ? data : [data];
      const org = items.find(
        (i: any) => i['@type'] && ['Organization', 'LocalBusiness', 'Corporation', 'Store', 'Restaurant', 'Hotel'].some(t => i['@type'] === t || (Array.isArray(i['@type']) && i['@type'].includes(t)))
      );
      if (org) return org;
    } catch { /* skip invalid JSON */ }
  }
  return null;
}

function firstMatch(text: string, re: RegExp): string {
  return re.exec(text)?.[1]?.trim() ?? '';
}

function extractPhone(text: string): string {
  // Italian formats: +39, 0xx, 3xx mobile
  const m = text.match(/(?:tel[.:\s]*|phone[:\s]*|telefono[:\s]*)?(\+39[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?)/i);
  return m ? (m[0].replace(/^[^+\d]*/,'').trim()) : '';
}

function extractVAT(text: string): string {
  const m = text.match(/(?:P\.?\s*IVA|VAT|Partita IVA)[:\s]*([A-Z]{0,2}[\s]?\d{11})/i);
  return m ? m[1].replace(/\s/g, '') : '';
}

function extractEmail(doc: Document, rawText: string): string {
  // From mailto links first
  const mailto = doc.querySelector('a[href^="mailto:"]');
  if (mailto) {
    const addr = (mailto.getAttribute('href') || '').replace('mailto:', '').split('?')[0];
    if (addr && !addr.startsWith('info@example')) return addr;
  }
  // From text
  const m = rawText.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  return m ? m[0] : '';
}

export async function scrapeContactFromUrl(url: string): Promise<ScrapedContact> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  const json = await res.json();
  const html: string = json.contents ?? '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const rawText = doc.body?.innerText ?? doc.body?.textContent ?? '';
  const ld = extractJsonLd(doc);

  // ── Name / company ──────────────────────────────────────────
  const company =
    ld?.name ||
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.title?.split(/[|\-–]/)[0]?.trim() ||
    '';

  // ── Phone ────────────────────────────────────────────────────
  const ldPhone = ld?.telephone ?? '';
  const phone = ldPhone || extractPhone(rawText);

  // ── Email ────────────────────────────────────────────────────
  const ldEmail = ld?.email ?? '';
  const email = ldEmail || extractEmail(doc, rawText);

  // ── Address ─────────────────────────────────────────────────
  const ldAddr = ld?.address ?? {};
  const address = ldAddr.streetAddress || firstMatch(rawText, /(?:Via|Viale|Corso|Piazza|Strada|Loc\.?)[^\n,]{3,60}/i);
  const city    = ldAddr.addressLocality || '';
  const zipCode = ldAddr.postalCode || firstMatch(rawText, /\b(\d{5})\b/);
  const province= ldAddr.addressRegion || '';
  const country = ldAddr.addressCountry || 'IT';

  // ── VAT ──────────────────────────────────────────────────────
  const vatNumber = ld?.taxID || extractVAT(rawText);

  // ── Sector ───────────────────────────────────────────────────
  const sector =
    ld?.description?.slice(0, 80) ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content')?.slice(0, 80) ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.slice(0, 80) ||
    '';

  // ── Notes ────────────────────────────────────────────────────
  const notes =
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    '';

  // ── Contact person ───────────────────────────────────────────
  const founderRaw = ld?.founder?.name || ld?.employee?.[0]?.name || '';

  return {
    company: company.slice(0, 120),
    contactName: founderRaw,
    role: '',
    email: email.slice(0, 120),
    phone: phone.slice(0, 40),
    website: url,
    address: address.slice(0, 120),
    city: city.slice(0, 80),
    zipCode: zipCode.slice(0, 10),
    province: province.slice(0, 4),
    country: country.slice(0, 4),
    vatNumber: vatNumber.slice(0, 20),
    sector: sector.slice(0, 80),
    notes: notes.slice(0, 300),
  };
}
