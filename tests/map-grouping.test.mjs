import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/map/groupMarkers.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const { groupMarkers } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const project = (lat, lng) => ({ x: lng * 100, y: lat * 100 });

test('nearby contacts form a group without losing their identity', () => {
  const contacts = [{ id: 'a', lat: 1, lng: 1 }, { id: 'b', lat: 1.01, lng: 1.01 }, { id: 'c', lat: 4, lng: 4 }];
  const groups = groupMarkers(contacts, () => true, project);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.flatMap(group => group.items.map(item => item.id)).sort(), ['a', 'b', 'c']);
});

test('only visible and valid coordinates are projected, including zero coordinates', () => {
  const contacts = [{ id: 'zero', lat: 0, lng: 0 }, { id: 'away', lat: 3, lng: 3 }, { id: 'missing', lat: null, lng: 1 }];
  let projections = 0;
  const groups = groupMarkers(contacts, (lat, lng) => lat < 2 && lng < 2, (lat, lng) => { projections++; return project(lat, lng); });
  assert.equal(projections, 1);
  assert.deepEqual(groups.flatMap(group => group.items.map(item => item.id)), ['zero']);
});

test('many colocated clients remain available in one group', () => {
  const contacts = Array.from({ length: 5000 }, (_, id) => ({ id, lat: 45, lng: 9 }));
  const groups = groupMarkers(contacts, () => true, project);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 5000);
  assert.equal(groups[0].items.at(-1).id, 4999);
});

test('a dense phone viewport renders far fewer groups without losing visible clients', () => {
  const contacts = Array.from({ length: 10000 }, (_, id) => ({
    id, lat: (id % 800) / 100, lng: ((id * 17) % 400) / 100,
  }));
  const groups = groupMarkers(contacts, () => true, project);
  assert.ok(groups.length <= 7 * 13);
  assert.equal(groups.reduce((sum, group) => sum + group.items.length, 0), contacts.length);
});
