export interface PositionedMarker {
  lat?: number | null;
  lng?: number | null;
}

export type MarkerGroup<T> = { key: string; items: T[]; lat: number; lng: number };

/** Group only visible coordinates into screen-sized cells, without dropping contacts. */
export function groupMarkers<T extends PositionedMarker>(
  items: readonly T[],
  isVisible: (lat: number, lng: number) => boolean,
  project: (lat: number, lng: number) => { x: number; y: number },
  cellSize = 64,
): MarkerGroup<T>[] {
  const cells = new Map<string, MarkerGroup<T>>();
  for (const item of items) {
    const { lat, lng } = item;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || !isVisible(lat, lng)) continue;
    const point = project(lat, lng);
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const existing = cells.get(key);
    if (existing) {
      existing.items.push(item);
      // The centre stays within the group; no coordinate is discarded.
      existing.lat += (lat - existing.lat) / existing.items.length;
      existing.lng += (lng - existing.lng) / existing.items.length;
    } else {
      cells.set(key, { key, items: [item], lat, lng });
    }
  }
  return Array.from(cells.values());
}
