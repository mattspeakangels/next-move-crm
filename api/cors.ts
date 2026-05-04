export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  // Vercel deployment domains
  const vercelOrigins = process.env.VERCEL_URL ? [
    `https://${process.env.VERCEL_URL}`,
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean) : [];

  return [...new Set([...envOrigins, ...defaultOrigins, ...vercelOrigins])];
}

export function applyCors(
  req: { headers: Record<string, string> },
  res: { setHeader: (name: string, value: string) => void }
): boolean {
  const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed + '/'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  return false;
}

export function handleCorsPreFlight(
  req: { method: string; headers: Record<string, string> },
  res: {
    status: (code: number) => { json: (data: unknown) => void };
    setHeader: (name: string, value: string) => void;
    json: (data: unknown) => void;
  }
): boolean {
  if (req.method === 'OPTIONS') {
    const allowed = applyCors(req, res);
    if (!allowed) {
      res.status(403).json({ error: 'CORS not allowed for this origin' });
      return true;
    }
    res.status(200).json({});
    return true;
  }
  return false;
}
