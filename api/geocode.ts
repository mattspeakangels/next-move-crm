import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, city } = req.query;

  if (!address || !city) {
    return res.status(400).json({ error: 'Missing address or city' });
  }

  try {
    const q = encodeURIComponent(`${address}, ${city}, Italy`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
      { headers: { 'Accept-Language': 'it', 'User-Agent': 'NextMoveCRM' } }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
};
