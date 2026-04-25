// Vercel Node.js serverless function (no Edge runtime)
// Uses raw fetch to Anthropic API to avoid SDK/Edge incompatibilities

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

${stakeholders?.length ? `**Interlocutori**:\n${stakeholders.map((s: { name: string; role: string }) => `- ${s.name} (${s.role})`).join('\n')}` : ''}
${intelligence?.competitors?.length ? `**Competitor attivi**: ${intelligence.competitors.join(', ')}` : ''}
${intelligence?.products?.length ? `**Prodotti attualmente usati**: ${intelligence.products.join(', ')}` : ''}
${intelligence?.pricesAndPayments ? `**Note su prezzi/pagamenti**: ${intelligence.pricesAndPayments}` : ''}
${intelligence?.logisticsAndService ? `**Logistica/Servizio**: ${intelligence.logisticsAndService}` : ''}
${recentActivities?.length ? `**Ultime attività**:\n${recentActivities.slice(0, 3).map((a: { type: string; date: string; outcome: string; notes: string }) => `- ${a.type} (${a.date}): ${a.outcome}${a.notes ? ` — ${a.notes}` : ''}`).join('\n')}` : ''}
${openDeals?.length ? `**Opportunità aperte**:\n${openDeals.map((d: { stage: string; value: number; nextAction: string; notes: string }) => `- Stage: ${d.stage}, Valore: €${d.value}, Prossima azione: ${d.nextAction}`).join('\n')}` : ''}

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
  return `Sei un coach commerciale esperto. Analizza questa pipeline di un agente Blåkläder (workwear professionale).

**PIPELINE**: ${deals.length} opportunità | Totale €${totalValue.toLocaleString('it')} | Pesato €${weightedValue.toLocaleString('it')}

**Deal**:
${deals.map(d => `- ${d.company} | ${d.stage} | €${d.value.toLocaleString('it')} | ${d.probability}% | ${d.daysOpen}gg | ${d.nextAction}${d.deadlinePassed ? ' ⚠️ SCADUTO' : ''}`).join('\n')}

${overdue.length > 0 ? `**SCADUTI**: ${overdue.map(d => d.company).join(', ')}` : ''}

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
  const itemLines = items.map(it => {
    const net = it.price * it.quantity * (1 - it.discount / 100);
    return `- ${it.description}: ${it.quantity} pz × €${it.price}${it.discount > 0 ? ` (-${it.discount}%)` : ''} = €${net.toFixed(2)}`;
  }).join('\n');

  return `Sei un agente commerciale Blåkläder. Scrivi una email di accompagnamento per questa offerta.

**Offerta**: ${offerNumber} | Cliente: ${company}${contactName ? ` — ${contactName}${contactRole ? ` (${contactRole})` : ''}` : ''}
**Tipo**: ${customerType === 'dealer' ? 'Rivenditore' : 'Utilizzatore finale'}

**Articoli**:
${itemLines}
**Totale**: €${totalAmount.toFixed(2)}${deliveryTime ? ` | Consegna: ${deliveryTime}` : ''}

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

export default async function handler(req: { method: string; body: unknown }, res: {
  status: (code: number) => { json: (data: unknown) => void };
  setHeader: (name: string, value: string) => void;
  json: (data: unknown) => void;
}) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    const { type, data } = req.body as { type: string; data: unknown };

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
        res.status(400).json({ error: 'Tipo non valido' });
        return;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic error:', response.status, errBody);
      res.status(500).json({ error: `Anthropic ${response.status}: ${errBody}` });
      return;
    }

    const json = await response.json() as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = json.content.find(b => b.type === 'text')?.text ?? '';
    res.json({ result: text });

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Errore interno' });
  }
}
