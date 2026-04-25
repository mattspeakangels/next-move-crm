import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  return `Sei un assistente commerciale esperto nel settore dell'abbigliamento da lavoro professionale (workwear), in particolare per il marchio Blåkläder.

Devo preparare una visita commerciale presso:
- **Azienda**: ${company}
- **Settore**: ${sector}
- **Tipo cliente**: ${customerType === 'dealer' ? 'Rivenditore/Dealer' : customerType === 'end-user' ? 'Utilizzatore finale' : 'Non specificato'}
- **Regione**: ${region || 'Non specificata'}

${stakeholders?.length ? `**Interlocutori**:\n${stakeholders.map(s => `- ${s.name} (${s.role})`).join('\n')}` : ''}

${intelligence?.competitors?.length ? `**Competitor attivi**: ${intelligence.competitors.join(', ')}` : ''}
${intelligence?.products?.length ? `**Prodotti attualmente usati**: ${intelligence.products.join(', ')}` : ''}
${intelligence?.pricesAndPayments ? `**Note su prezzi/pagamenti**: ${intelligence.pricesAndPayments}` : ''}
${intelligence?.logisticsAndService ? `**Logistica/Servizio**: ${intelligence.logisticsAndService}` : ''}

${recentActivities?.length ? `**Ultime attività**:\n${recentActivities.slice(0, 3).map(a => `- ${a.type} (${a.date}): ${a.outcome}${a.notes ? ` — ${a.notes}` : ''}`).join('\n')}` : ''}

${openDeals?.length ? `**Opportunità aperte**:\n${openDeals.map(d => `- Stage: ${d.stage}, Valore: €${d.value}, Prossima azione: ${d.nextAction}${d.notes ? ` — ${d.notes}` : ''}`).join('\n')}` : ''}

Prepara una briefing per la visita in italiano, strutturato così:
1. **Obiettivo visita** (1-2 frasi chiare su cosa voglio ottenere)
2. **Punti di forza da valorizzare** (3-4 punti specifici su Blåkläder adatti a questo cliente)
3. **Domande chiave da fare** (5 domande per capire i bisogni e fare upsell)
4. **Possibili obiezioni e come gestirle** (2-3 obiezioni probabili con risposta)
5. **Azione successiva suggerita** (cosa proporre a fine visita)

Sii conciso, pratico e orientato alla vendita. Usa il tu quando parli all'agente.`;
}

function buildPipelinePrompt(data: {
  deals: Array<{
    id: string;
    company: string;
    stage: string;
    value: number;
    probability: number;
    daysOpen: number;
    nextActionDeadline: string;
    deadlinePassed: boolean;
    nextAction: string;
    notes: string;
  }>;
  totalValue: number;
  weightedValue: number;
}): string {
  const { deals, totalValue, weightedValue } = data;

  const byStage = deals.reduce((acc, d) => {
    acc[d.stage] = (acc[d.stage] || []);
    acc[d.stage].push(d);
    return acc;
  }, {} as Record<string, typeof deals>);

  const stageLines = Object.entries(byStage)
    .map(([stage, ds]) => `**${stage}** (${ds.length}): ${ds.map(d => `${d.company} €${d.value.toLocaleString('it')}`).join(', ')}`)
    .join('\n');

  const overdue = deals.filter(d => d.deadlinePassed);

  return `Sei un coach commerciale esperto. Analizza la pipeline di vendita di un agente Blåkläder (abbigliamento da lavoro professionale) e fornisci consigli pratici.

**PIPELINE ATTUALE**
- Valore totale: €${totalValue.toLocaleString('it')}
- Valore pesato (con probabilità): €${weightedValue.toLocaleString('it')}
- Numero opportunità: ${deals.length}

**Distribuzione per stage**:
${stageLines}

${overdue.length > 0 ? `**SCADUTI** (azione in ritardo):\n${overdue.map(d => `- ${d.company}: ${d.nextAction} (scaduto il ${d.nextActionDeadline})`).join('\n')}` : '**Nessuna azione scaduta** ✓'}

**Dettaglio opportunità**:
${deals.map(d => `- ${d.company} | ${d.stage} | €${d.value.toLocaleString('it')} | ${d.probability}% | Aperto da ${d.daysOpen}gg | Prossima: ${d.nextAction}${d.deadlinePassed ? ' ⚠️ SCADUTO' : ''}`).join('\n')}

Analizza la pipeline in italiano e fornisci:
1. **Stato generale** (2-3 frasi: salute della pipeline, rischi principali)
2. **Top 3 priorità questa settimana** (opportunità specifiche su cui concentrarsi, con motivazione)
3. **Opportunità a rischio** (deal fermi o con deadline passate — cosa fare)
4. **Quick wins** (opportunità vicine alla chiusura — azione concreta suggerita)
5. **Azione #1 da fare oggi** (una sola cosa, la più impattante)

Sii diretto, specifico per azienda, usa nomi reali. Niente frasi generiche.`;
}

function buildEmailOffertaPrompt(data: {
  offerNumber: string;
  company: string;
  contactName?: string;
  contactRole?: string;
  items: Array<{ description: string; quantity: number; price: number; discount: number }>;
  totalAmount: number;
  deliveryTime?: string;
  customerType?: string;
  sector?: string;
  notes?: string;
}): string {
  const { offerNumber, company, contactName, contactRole, items, totalAmount, deliveryTime, customerType, sector } = data;

  const itemLines = items.map(it => {
    const net = it.price * it.quantity * (1 - it.discount / 100);
    return `- ${it.description}: ${it.quantity} pz × €${it.price}${it.discount > 0 ? ` (-${it.discount}%)` : ''} = €${net.toFixed(2)}`;
  }).join('\n');

  return `Sei un agente commerciale Blåkläder professionale. Scrivi una email di accompagnamento per inviare un'offerta commerciale.

**DETTAGLI OFFERTA**
- Numero offerta: ${offerNumber}
- Cliente: ${company}${contactName ? ` — ${contactName}${contactRole ? ` (${contactRole})` : ''}` : ''}
- Tipo cliente: ${customerType === 'dealer' ? 'Rivenditore' : customerType === 'end-user' ? 'Utilizzatore finale' : 'Non specificato'}
- Settore: ${sector || 'Non specificato'}

**Articoli in offerta**:
${itemLines}

**Totale offerta**: €${totalAmount.toFixed(2)}
${deliveryTime ? `**Tempi di consegna**: ${deliveryTime}` : ''}

Scrivi una email professionale in italiano che:
- Abbia oggetto chiaro con numero offerta
- Sia personale e non generica (usa il nome se disponibile)
- Riassuma brevemente i punti di forza dell'offerta (qualità Blåkläder, rapporto qualità/prezzo)
- Includa una call to action chiara (es. fissa una chiamata per discutere)
- Sia cordiale ma concisa (max 150 parole corpo)
- Firmi come agente commerciale Blåkläder

Formato output:
**OGGETTO**: [oggetto email]

**CORPO**:
[testo email]`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  try {
    const body = await req.json() as { type: string; data: unknown };
    const { type, data } = body;

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
        return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content.find(b => b.type === 'text')?.text ?? '';

    return new Response(JSON.stringify({ result: text }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Claude API error:', err);
    return new Response(JSON.stringify({ error: 'AI error, try again' }), { status: 500 });
  }
}

export const config = { runtime: 'edge' };
