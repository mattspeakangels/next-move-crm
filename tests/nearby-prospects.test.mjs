import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/components/agenda/nearbyProspects.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node' });
const { findNearbyProspects, distanceKm } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

// Origine: centro di Bologna
const origin = { id: 'o', company: 'Cliente', status: 'cliente', lat: 44.4949, lng: 11.3426 };
const contacts = {
  o: origin,
  near: { id: 'near', company: 'Vicino', status: 'potenziale', lat: 44.52, lng: 11.36 },        // ~3 km
  far: { id: 'far', company: 'Lontano', status: 'potenziale', lat: 44.70, lng: 11.40 },          // ~23 km
  client: { id: 'client', company: 'Altro cliente', status: 'cliente', lat: 44.50, lng: 11.35 }, // cliente, escluso
  branch: { id: 'branch', company: 'Sede', status: 'potenziale', lat: 45.4, lng: 9.2, locations: [{ lat: 44.55, lng: 11.40 }] }, // sede secondaria ~7.7 km
  nogeo: { id: 'nogeo', company: 'Senza coordinate', status: 'potenziale' },
  zero: { id: 'zero', company: 'Zero', status: 'potenziale', lat: 0, lng: 0 },
};

test('distanceKm ~ Bologna-Modena 37 km', () => {
  const km = distanceKm({ lat: 44.4949, lng: 11.3426 }, { lat: 44.6471, lng: 10.9252 });
  assert.ok(km > 35 && km < 39, String(km));
});
test('solo prospect entro 10 km, ordinati per distanza, sedi secondarie incluse', () => {
  assert.deepEqual(findNearbyProspects(origin, contacts).map(r => r.contact.id), ['near', 'branch']);
});
test('esclude i contatti già in agenda', () => {
  assert.deepEqual(findNearbyProspects(origin, contacts, new Set(['near'])).map(r => r.contact.id), ['branch']);
});
test('origine senza coordinate: nessun suggerimento', () => {
  assert.deepEqual(findNearbyProspects({ id: 'x', status: 'cliente' }, contacts), []);
});
