export default async function handler(
  req: { method: string; query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, city, province } = req.query;
  const cityStr = Array.isArray(city) ? city[0] : city;
  const addrStr = Array.isArray(address) ? address[0] : address;
  const provStr = Array.isArray(province) ? province[0] : province;

  if (!cityStr && !addrStr) {
    return res.status(400).json({ error: 'Missing city or address' });
  }

  // Rileva contatti svizzeri (Canton Ticino e altri cantoni)
  const swissProvinces = ['TI', 'GR', 'VS', 'VD', 'GE', 'NE', 'FR', 'BE', 'ZH', 'AG', 'SO', 'BS', 'BL', 'CH'];
  const isSwiss = swissProvinces.includes((provStr ?? '').toUpperCase());
  const country = isSwiss ? 'Switzerland' : 'Italy';

  try {
    const parts: string[] = [];
    if (addrStr) parts.push(addrStr);
    if (cityStr) parts.push(cityStr);
    parts.push(country);

    const q = encodeURIComponent(parts.join(', '));
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
      { headers: { 'Accept-Language': 'it', 'User-Agent': 'NextMoveCRM/1.0' } }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
}
