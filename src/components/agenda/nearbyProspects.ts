import type { Contact } from '../../types';

export const NEARBY_RADIUS_KM = 10;
const MAX_SUGGESTIONS = 15;

type Point = { lat: number; lng: number };

const isValid = (lat?: number, lng?: number): boolean =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

/** Sede principale + sedi aggiuntive con coordinate valide. */
export function contactPoints(c: Pick<Contact, 'lat' | 'lng' | 'locations'>): Point[] {
  const pts: Point[] = [];
  if (isValid(c.lat, c.lng)) pts.push({ lat: c.lat as number, lng: c.lng as number });
  for (const l of c.locations ?? []) if (isValid(l.lat, l.lng)) pts.push({ lat: l.lat as number, lng: l.lng as number });
  return pts;
}

/** Distanza in linea d'aria (haversine), in km. */
export function distanceKm(a: Point, b: Point): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface NearbyProspect { contact: Contact; km: number }

/**
 * Prospect (status "potenziale") entro `radiusKm` da una qualsiasi sede del contatto di partenza,
 * ordinati per distanza. Esclude gli id in `excludeIds` (es. già in agenda quel giorno).
 */
export function findNearbyProspects(
  origin: Contact,
  contacts: Record<string, Contact>,
  excludeIds: Set<string> = new Set(),
  radiusKm = NEARBY_RADIUS_KM,
): NearbyProspect[] {
  const from = contactPoints(origin);
  if (from.length === 0) return [];
  const out: NearbyProspect[] = [];
  for (const c of Object.values(contacts)) {
    if (c.id === origin.id || c.status !== 'potenziale' || excludeIds.has(c.id)) continue;
    let best = Infinity;
    for (const p of contactPoints(c)) for (const o of from) best = Math.min(best, distanceKm(o, p));
    if (best <= radiusKm) out.push({ contact: c, km: best });
  }
  return out.sort((a, b) => a.km - b.km).slice(0, MAX_SUGGESTIONS);
}
