// Vercel Node.js serverless function
// Uses raw fetch to Anthropic API with fallback to cheapest models

import { z } from 'zod';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const StakeholderSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
});

const IntelligenceSchema = z.object({
  products: z.array(z.string().max(200)).optional(),
  competitors: z.array(z.string().max(200)).optional(),
  pricesAndPayments: z.string().max(500).optional(),
  logisticsAndService: z.string().max(500).optional(),
}).optional();

const ActivitySchema = z.object({
  type: z.string().max(100),
  date: z.string().max(20),
  outcome: z.string().max(300),
  notes: z.string().max(300).optional(),
});

const DealSchema = z.object({
  company: z.string().min(1).max(200),
  stage: z.string().max(100),
  value: z.number().positive(),
  probability: z.number().min(0).max(100).optional(),
  nextAction: z.string().max(300),
  notes: z.string().max(300).optional(),
  daysOpen: z.number().optional(),
  nextActionDeadline: z.string().optional(),
  deadlinePassed: z.boolean().optional(),
});

const VisitaDataSchema = z.object({
  company: z.string().min(1).max(200),
  sector: z.string().min(1).max(200),
  customerType: z.enum(['dealer', 'end-user']).optional(),
  region: z.string().max(200).optional(),
  intelligence: IntelligenceSchema,
  recentActivities: z.array(ActivitySchema).max(10).optional(),
  openDeals: z.array(DealSchema).max(20).optional(),
  stakeholders: z.array(StakeholderSchema).max(10).optional(),
});

const PipelineDataSchema = z.object({
  deals: z.array(DealSchema).min(1).max(100),
  totalValue: z.number().nonnegative(),
  weightedValue: z.number().nonnegative(),
});

const ItemSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().positive(),
  price: z.number().positive(),
  discount: z.number().min(0).max(100),
});

const EmailOffertaDataSchema = z.object({
  offerNumber: z.string().min(1).max(50),
  company: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  contactRole: z.string().max(200).optional(),
  items: z.array(ItemSchema).min(1).max(100),
  totalAmount: z.number().positive(),
  deliveryTime: z.string().max(200).optional(),
  customerType: z.enum(['dealer', 'end-user']).optional(),
  sector: z.string().max(200).optional(),
});

const RequestSchema = z.object({
  type: z.enum(['prepara-visita', 'analizza-pipeline', 'email-offerta']),
  data: z.union([VisitaDataSchema, PipelineDataSchema, EmailOffertaDataSchema]),
});

// ─── Security utilities ───────────────────────────────────────────────────────

function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\n\r]/g, ' ')  // Remove newlines (prevent injection)
    .replace(/"/g, '\\"')      // Escape quotes
    .replace(/'/g, "\\'")      // Escape single quotes
    .substring(0, 500);        // Max 500 chars
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildVisitaPrompt(data: {
  company: string;
  sector: string;
  customerType?: string;
  region?: string;
  intelligence?: {
    products?: string[];
    competitors?: string[];
    pricesAndPayments?: string;
    logisticsAndService?: string;
  };
  recentActivities?: Array<{ type: string; date: string; outcome: string; notes: string }>;
  openDeals?: Array<{ stage: string; value: number; nextAction: string; notes: string }>;
  stakeholders?: Array<{ name: string; role: string }>;
}): string {
  const { company, sector, customerType, region, intelligence, recentActivities, openDeals, stakeholders } = data;

  // Sanitize all inputs
  const safeCompany = sanitizeInput(company);
  const safeSector = sanitizeInput(sector);
  const safeRegion = sanitizeInput(region || '');
  const safeStakeholders = stakeholders?.map(s => ({ name: sanitizeInput(s.name), role: sanitizeInput(s.role) })) || [];
  const safeCompetitors = intelligence?.competitors?.map(c => sanitizeInput(c)) || [];
  const safeProducts = intelligence?.products?.map(p => sanitizeInput(p)) || [];
  const safePrices = sanitizeInput(intelligence?.pricesAndPayments || '');
  const safeLogistics = sanitizeInput(intelligence?.logisticsAndService || '');
  const safeActivities = recentActivities?.slice(0, 3).map(a => ({
    type: sanitizeInput(a.type),
    date: sanitizeInput(a.date),
    outcome: sanitizeInput(a.outcome),
    notes: sanitizeInput(a.notes || '')
  })) || [];
  const safeDeals = openDeals?.map(d => ({
    stage: sanitizeInput(d.stage),
    value: d.value,
    nextAction: sanitizeInput(d.nextAction),
    notes: sanitizeInput(d.notes || '')
  })) || [];

  return `Sei un assistente commerciale esperto nel settore dell'abbigliamento da lavoro professionale (workwear), in particolare per il marchio Blåkläder.

Devo preparare una visita commerciale presso:
- **Azienda**: ${safeCompany}
- **Settore**: ${safeSector}
- **Tipo cliente**: ${customerType === 'dealer' ? 'Rivenditore/Dealer' : customerType === 'end-user' ? 'Utilizzatore finale' : 'Non specificato'}
- **Regione**: ${safeRegion || 'Non specificata'}

${safeStakeholders?.length ? `**Interlocutori**:\n${safeStakeholders.map((s) => `- ${s.name} (${s.role})`).join('\n')}` : ''}
${safeCompetitors?.length ? `**Competitor attivi**: ${safeCompetitors.join(', ')}` : ''}
${safeProducts?.length ? `**Prodotti attualmente usati**: ${safeProducts.join(', ')}` : ''}
${safePrices ? `**Note su prezzi/pagamenti**: ${safePrices}` : ''}
${safeLogistics ? `**Logistica/Servizio**: ${safeLogistics}` : ''}
${safeActivities?.length ? `**Ultime attività**:\n${safeActivities.map((a) => `- ${a.type} (${a.date}): ${a.outcome}${a.notes ? ` — ${a.notes}` : ''}`).join('\n')}` : ''}
${safeDeals?.length ? `**Opportunità aperte**:\n${safeDeals.map((d) => `- Stage: ${d.stage}, Valore: €${d.value}, Prossima azione: ${d.nextAction}`).join('\n')}` : ''}

Prepara una briefing per la visita in italiano:
1. **Obiettivo visita** (1-2 frasi)
2. **Punti di forza da valorizzare** (3-4 punti specifici Blåkläder per questo cliente)
3. **Domande chiave da fare** (5 domande)
4. **Possibili obiezioni e come gestirle** (2-3 obiezioni con risposta)
5. **Azione successiva suggerita**

Sii conciso, pratico, orientato alla vendita. Usa il tu.`;
}

function buildPipelinePrompt(data: {
  deals: Array<{
    company: string; stage: string; value: number; probability: number;
    daysOpen: number; nextActionDeadline: string; deadlinePassed: boolean;
    nextAction: string;
  }>;
  totalValue: number;
  weightedValue: number;
}): string {
  const { deals, totalValue, weightedValue } = data;
  const overdue = deals.filter(d => d.deadlinePassed);

  // Sanitize deals
  const safeDeals = deals.map(d => ({
    ...d,
    company: sanitizeInput(d.company),
    stage: sanitizeInput(d.stage),
    nextAction: sanitizeInput(d.nextAction)
  }));

  const safeOverdue = overdue.map(d => sanitizeInput(d.company));

  return `Sei un coach commerciale esperto. Analizza questa pipeline di un agente Blåkläder (workwear professionale).

**PIPELINE**: ${safeDeals.length} opportunità | Totale €${totalValue.toLocaleString('it')} | Pesato €${weightedValue.toLocaleString('it')}

**Deal**:
${safeDeals.map(d => `- ${d.company} | ${d.stage} | €${d.value.toLocaleString('it')} | ${d.probability}% | ${d.daysOpen}gg | ${d.nextAction}${d.deadlinePassed ? ' ⚠️ SCADUTO' : ''}`).join('\n')}

${safeOverdue.length > 0 ? `**SCADUTI**: ${safeOverdue.join(', ')}` : ''}

Analisi in italiano:
1. **Stato generale** (2-3 frasi)
2. **Top 3 priorità questa settimana** (aziende specifiche + motivazione)
3. **Opportunità a rischio** (cosa fare)
4. **Quick wins** (vicini alla chiusura)
5. **Azione #1 da fare oggi**

Usa nomi reali, niente frasi generiche.`;
}

function buildEmailOffertaPrompt(data: {
  offerNumber: string; company: string; contactName?: string; contactRole?: string;
  items: Array<{ description: string; quantity: number; price: number; discount: number }>;
  totalAmount: number; deliveryTime?: string; customerType?: string; sector?: string;
}): string {
  const { offerNumber, company, contactName, contactRole, items, totalAmount, deliveryTime, customerType } = data;

  // Sanitize inputs
  const safeOfferNumber = sanitizeInput(offerNumber);
  const safeCompany = sanitizeInput(company);
  const safeContactName = sanitizeInput(contactName || '');
  const safeContactRole = sanitizeInput(contactRole || '');
  const safeDeliveryTime = sanitizeInput(deliveryTime || '');

  const itemLines = items.map(it => {
    const net = it.price * it.quantity * (1 - it.discount / 100);
    return `- ${sanitizeInput(it.description)}: ${it.quantity} pz × €${it.price}${it.discount > 0 ? ` (-${it.discount}%)` : ''} = €${net.toFixed(2)}`;
  }).join('\n');

  return `Sei un agente commerciale Blåkläder. Scrivi una email di accompagnamento per questa offerta.

**Offerta**: ${safeOfferNumber} | Cliente: ${safeCompany}${safeContactName ? ` — ${safeContactName}${safeContactRole ? ` (${safeContactRole})` : ''}` : ''}
**Tipo**: ${customerType === 'dealer' ? 'Rivenditore' : 'Utilizzatore finale'}

**Articoli**:
${itemLines}
**Totale**: €${totalAmount.toFixed(2)}${safeDeliveryTime ? ` | Consegna: ${safeDeliveryTime}` : ''}

Scrivi email professionale in italiano:
- Oggetto con numero offerta
- Personale (usa il nome se disponibile)
- Breve highlight offerta (qualità Blåkläder, valore)
- Call to action chiara
- Max 150 parole corpo

Formato:
**OGGETTO**: [oggetto]

**CORPO**:
[testo]`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://your-domain.com',
  'https://www.your-domain.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

export default async function handler(req: { method: string; body: unknown; headers: Record<string, string> }, res: {
  status: (code: number) => { json: (data: unknown) => void };
  setHeader: (name: string, value: string) => void;
  json: (data: unknown) => void;
}) {
  const origin = req.headers.origin || req.headers.referer;

  // Only set CORS headers if origin is in whitelist
  if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed || ''))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata su Vercel' });
    return;
  }

  try {
    // Validate request body against schema
    const validated = RequestSchema.parse(req.body);
    const { type, data } = validated;

    let prompt: string;
    switch (type) {
      case 'prepara-visita':
        prompt = buildVisitaPrompt(data as Parameters<typeof buildVisitaPrompt>[0]);
        break;
      case 'analizza-pipeline':
        prompt = buildPipelinePrompt(data as Parameters<typeof buildPipelinePrompt>[0]);
        break;
      case 'email-offerta':
        prompt = buildEmailOffertaPrompt(data as Parameters<typeof buildEmailOffertaPrompt>[0]);
        break;
      default:
        res.status(400).json({ error: 'Invalid request type' });
        return;
    }

    // Try models in order of cost (cheapest first)
    const models = ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-6'];
    let lastError = '';

    for (const model of models) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          lastError = `${model}: ${response.status}`;
          continue;
        }

        const json = await response.json() as {
          content: Array<{ type: string; text?: string }>;
        };
        const text = json.content.find(b => b.type === 'text')?.text ?? '';
        res.json({ result: text });
        return;

      } catch (err) {
        lastError = `${model}: ${err instanceof Error ? err.message : 'error'}`;
        continue;
      }
    }

    // All models failed
    res.status(500).json({ error: `Nessun modello disponibile (${lastError})` });

  } catch (err) {
    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      const issues = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      console.error('Validation error:', issues);
      res.status(400).json({ error: 'Invalid request data', details: issues });
      return;
    }

    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
