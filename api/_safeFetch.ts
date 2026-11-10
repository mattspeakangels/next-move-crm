// Fetch verso URL forniti dall'utente, con protezione SSRF: solo http/https su porte
// standard, nessun indirizzo privato o interno (verificato sull'IP risolto dal DNS, non
// sul nome), redirect seguiti a mano e ricontrollati a ogni salto.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class UnsafeUrlError extends Error {}

function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || b === 0))
      || (a === 198 && (b === 18 || b === 19));
  }
  if (v === 6) {
    const low = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(low);
    if (mapped) return isPrivateIp(mapped[1]);
    return low === '::' || low === '::1' || low.startsWith('fc') || low.startsWith('fd')
      || low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')
      || low.startsWith('ff') || low.startsWith('::ffff:') || low.startsWith('64:ff9b:');
  }
  return true;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new UnsafeUrlError('URL non valido'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnsafeUrlError('Protocollo non consentito');
  if (url.username || url.password) throw new UnsafeUrlError('URL con credenziali non consentito');
  if (url.port && url.port !== '80' && url.port !== '443') throw new UnsafeUrlError('Porta non consentita');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map(a => a.address);
  if (addresses.length === 0) throw new UnsafeUrlError('Host non raggiungibile');
  if (addresses.some(isPrivateIp)) throw new UnsafeUrlError('Indirizzi privati o interni non consentiti');
  return url;
}

export async function safeFetch(raw: string, init: RequestInit = {}, maxRedirects = 4): Promise<Response> {
  let current = raw;
  for (let i = 0; i <= maxRedirects; i++) {
    const url = await assertPublicUrl(current);
    const response = await fetch(url, { ...init, redirect: 'manual' });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    return response;
  }
  throw new UnsafeUrlError('Troppi reindirizzamenti');
}
