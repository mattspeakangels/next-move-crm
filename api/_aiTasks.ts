// Analisi AI operative (resoconti visita, conversazioni registrate) eseguite sul server
// con la chiave GEMINI_API_KEY: il browser manda solo i dati, mai un prompt libero.
// File autocontenuto (solo zod), così i test lo importano senza passare dal bundler.

import { z } from 'zod';

// ─── Schemi di ingresso ───────────────────────────────────────────────────────

const VISIT_TYPES = ['prima-visita', 'follow-up', 'offerta', 'chiamata'] as const;
type VisitType = typeof VISIT_TYPES[number];

// Stesso tetto del client (MAX_BATCH_SIZE in AgendaView).
export const MAX_RESOCONTI = 35;

const ResocontoSchema = z.object({
  contactName: z.string().max(200),
  visitType: z.enum(VISIT_TYPES),
  notes: z.string().min(1).max(20000),
});

const ResocontiSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(200),
    contactName: z.string().max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(20000),
  })).min(1).max(MAX_RESOCONTI),
});

const ConversazioneSchema = z.object({
  transcript: z.string().min(1).max(60000),
  isDealer: z.boolean(),
  contactName: z.string().max(200),
});

export const AI_TASK_TYPES = ['analizza-resoconto', 'analizza-resoconti', 'analizza-conversazione', 'verifica-ai'] as const;
export type AiTaskType = typeof AI_TASK_TYPES[number];

export function isAiTaskType(type: unknown): type is AiTaskType {
  return typeof type === 'string' && (AI_TASK_TYPES as readonly string[]).includes(type);
}

export const AiTaskRequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('analizza-resoconto'), data: ResocontoSchema }),
  z.object({ type: z.literal('analizza-resoconti'), data: ResocontiSchema }),
  z.object({ type: z.literal('analizza-conversazione'), data: ConversazioneSchema }),
  z.object({ type: z.literal('verifica-ai') }),
]);

export type AiTaskRequest = z.infer<typeof AiTaskRequestSchema>;

// ─── Liste chiuse per la profilazione (usate solo nel prompt) ─────────────────

const DEALER_PAIN_POINTS = [
  'Resi / difetti cucitura fornitore attuale',
  'Mancanza DPI Cat. III',
  'No supporto formativo ai venditori',
  'Margini insufficienti',
  'Gestione riordino macchinosa',
  'Nessun portale B2B',
  'No Brand premium riconoscibile',
  'Clienti finali chiedono qualità superiore',
  'Concorrenti zona trattano stesso brand',
];

const ENDUSER_PAIN_POINTS = [
  'Capi si rompono/logorano troppo presto',
  'Reclami RSPP su DPI non conformi',
  'Gestione taglie caotica',
  'Nessun controllo TCO/spesa reale',
  'Fornitore inaffidabile su consegne',
  'No logo / immagine coordinata',
  'Ispezione INAIL/ASL recente',
  'Cambio DVR imminente',
  'Nuovo cantiere / commessa PNRR',
];

const DEALER_PRODUCTS = [
  'Pantaloni 1990 X1900 (bestseller)',
  'Multinorma / Antifiamma (Cat. III)',
  'Alta Visibilità Cl.2-3',
  'Scarpe Elite / Striker (1970)',
  'Softshell 4491',
  'Linea Donna / Premaman',
  'Guanti tecnici',
  'B2B Webshop demo',
  'Gamma freddo (3 strati)',
  'Linea Service',
];

const ENDUSER_PRODUCTS = [
  'Pantaloni 1990 X1900',
  'Multinorma / Antifiamma (Cat. III)',
  'Alta Visibilità Cl.2-3',
  'Scarpe Elite / Striker',
  'Giacca Softshell 4491',
  'Linea Freddo (3 strati)',
  'Guanti tecnici Cat. III',
  'B2B Webshop demo',
  'Schede EN per DVR RSPP',
  'Linea Donna / Premaman',
  'Personalizzazione logo',
];

const BRANDS = ['Diadora', 'U-Power', 'Snickers', 'E.Strauss', 'Cofra', 'Kapriol', 'Sparco', 'Mascot', 'Fristads', 'Portwest', 'Clique', 'Helly Hansen', 'Altro'];

// ─── Prompt ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

const visitContext: Record<VisitType, string> = {
  'prima-visita': `prima visita commerciale / demo prodotto. Estrai tutte le azioni concrete emerse (offerte, campionature, schede tecniche, appuntamenti di follow-up, ecc.). Presta attenzione a eventuali impegni presi con il cliente.`,
  'follow-up': `visita di follow-up / ricontatto. Estrai le azioni di continuità: invii promessi, conferme, appuntamenti successivi, eventuali offerte da aggiornare.`,
  'offerta': `visita per presentazione/consegna offerta o quotazione. Estrai le azioni legate alla trattativa: follow-up sull'offerta, richieste di modifica prezzi, date di risposta attese dal cliente.`,
  'chiamata': `chiamata telefonica o email. Estrai solo le azioni concrete emerse: risposte da dare, materiali da inviare, appuntamenti da fissare.`,
};

function buildResocontoPrompt(data: z.infer<typeof ResocontoSchema>): string {
  const today = todayIso();
  const { contactName, notes: closeNotes, visitType: derivedVisitType } = data;
  return `Sei un assistente per un agente commerciale Blaklader (workwear premium).
Data oggi: ${today}. Cliente: "${contactName}".
Tipo di contatto: ${visitContext[derivedVisitType]}

Dal seguente resoconto, estrai TUTTE le azioni concrete da fare.
Per ogni azione specifica una data di esecuzione (quando farlo) e una scadenza massima, basandoti sulle urgenze menzionate nel testo.

RESOCONTO:
---
${closeNotes}
---

Rispondi SOLO con un array JSON valido:
[
  {
    "titolo": "descrizione concisa dell'azione",
    "tipo": "offerta"|"scheda-tecnica"|"email-info"|"chiamata-follow"|"campionatura"|"demo"|"visita"|"altro",
    "priorita": "alta"|"media"|"bassa",
    "dataEsecuzione": "YYYY-MM-DD",
    "scadenza": "YYYY-MM-DD",
    "note": "dettaglio utile (opzionale, stringa vuota se non necessario)"
  }
]

Regole:
- "alta" se c'è urgenza esplicita (entro oggi/domani/48h/fine settimana)
- "media" se entro 1-2 settimane
- "bassa" se non c'è urgenza definita
- dataEsecuzione = quando iniziare; scadenza = deadline massima
- Se il testo non menziona date, usa buon senso commerciale (offerta: 2gg, chiamata follow: 1 sett, campionatura: 2 sett)
- Includi SOLO azioni concrete, non osservazioni generiche

Regole per il campo "tipo" (fondamentale per non perdere appuntamenti):
- Usa "visita" quando si fissa un incontro di persona con il cliente a una data precisa (es. "fissato appuntamento", "ci vediamo", "passo a trovarlo", "devo tornare/ripassare da lui")
- Usa "chiamata-follow" quando si tratta di richiamarlo telefonicamente a una data precisa, senza incontro di persona
- Usa "demo" quando si tratta di una dimostrazione prodotto pianificata a una data precisa
- Qualsiasi frase che indica un impegno preso con il cliente per una data specifica (appuntamento, visita, richiamata, demo) DEVE avere dataEsecuzione valorizzata con la data esatta, non lasciata vuota
- Per le date relative usa Data oggi come riferimento: "giovedì della prossima settimana" = il giovedì della settimana successiva a quella corrente (non della settimana in corso), "lunedì prossimo"/"martedì prossimo" ecc. = stessa logica`;
}

function buildResocontiPrompt(data: z.infer<typeof ResocontiSchema>): string {
  const today = todayIso();
  const { items } = data;
  return `Sei un assistente per un agente commerciale Blaklader (workwear premium).
Data oggi: ${today}.

Di seguito trovi i resoconti di ${items.length} visite/appuntamenti commerciali GIA CONCLUSI, ognuno identificato da un "id" esatto. Per OGNUNO, estrai TUTTE le azioni concrete da fare (offerte, campionature, schede tecniche, follow-up, appuntamenti, ecc.), con data di esecuzione e scadenza basate sulle urgenze menzionate nel testo.

VISITE:
---
${items.map(it => `[id: ${it.id}] Cliente: "${it.contactName}" | Data visita: ${it.date}\nResoconto: ${it.notes}`).join('\n---\n')}
---

Rispondi SOLO con un array JSON valido, UN elemento per OGNI id fornito (anche con "todos": [] se non ci sono azioni concrete), in questo formato:
[
  {
    "id": "<id esatto fornito>",
    "todos": [
      {
        "titolo": "descrizione concisa dell'azione",
        "tipo": "offerta"|"scheda-tecnica"|"email-info"|"chiamata-follow"|"campionatura"|"demo"|"visita"|"altro",
        "priorita": "alta"|"media"|"bassa",
        "dataEsecuzione": "YYYY-MM-DD",
        "scadenza": "YYYY-MM-DD",
        "note": "dettaglio utile (opzionale, stringa vuota se non necessario)"
      }
    ]
  }
]

Regole:
- "alta" se c'è urgenza esplicita (entro oggi/domani/48h/fine settimana)
- "media" se entro 1-2 settimane
- "bassa" se non c'è urgenza definita
- dataEsecuzione = quando iniziare; scadenza = deadline massima
- Se il testo non menziona date, usa buon senso commerciale (offerta: 2gg, chiamata follow: 1 sett, campionatura: 2 sett)
- Includi SOLO azioni concrete, non osservazioni generiche
- Non omettere nessun id: se una visita non genera azioni, restituisci "todos": []

Regole per il campo "tipo" (fondamentale per non perdere appuntamenti):
- Usa "visita" quando si fissa un incontro di persona con il cliente a una data precisa (es. "fissato appuntamento", "ci vediamo", "passo a trovarlo", "devo tornare/ripassare da lui")
- Usa "chiamata-follow" quando si tratta di richiamarlo telefonicamente a una data precisa, senza incontro di persona
- Usa "demo" quando si tratta di una dimostrazione prodotto pianificata a una data precisa
- Qualsiasi frase che indica un impegno preso con il cliente per una data specifica (appuntamento, visita, richiamata, demo) DEVE avere dataEsecuzione valorizzata con la data esatta, non lasciata vuota
- Per le date relative usa Data oggi come riferimento: "giovedì della prossima settimana" = il giovedì della settimana successiva a quella corrente (non della settimana in corso), "lunedì prossimo"/"martedì prossimo" ecc. = stessa logica`;
}

function buildConversazionePrompt(transcript: string, isDealer: boolean, contactName: string): string {
  const painList = isDealer ? DEALER_PAIN_POINTS : ENDUSER_PAIN_POINTS;
  const productList = isDealer ? DEALER_PRODUCTS : ENDUSER_PRODUCTS;

  const baseInstruction = `Sei un assistente commerciale per Blaklader Italia (workwear premium). Hai registrato una conversazione di vendita con "${contactName}", ${isDealer ? 'un RIVENDITORE/DEALER' : 'un CLIENTE FINALE (end-user azienda)'}.

Dal trascritto seguente, estrai tutte le informazioni rilevanti per la scheda di profilazione e identifica le obiezioni sollevate.

TRASCRITTO:
---
${transcript}
---

Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo:`;

  const qualShape = `{
      "esigenzaReale": numero 1-5,
      "decisionMaker": numero 1-5,
      "aperturaFornitore": numero 1-5,
      "timeline": numero 1-5,
      "budget": numero 1-5
    }`;

  const obiezioniShape = `[
    {
      "testo": "l'obiezione esatta o parafrasata del cliente",
      "categoria": "prezzo|fornitore-attuale|qualita|timing|brand|logistica|altro",
      "risposta": "risposta commerciale suggerita specifica per Blaklader, max 2 righe"
    }
  ]`;

  if (isDealer) {
    return `${baseInstruction}

{
  "profiling": {
    "segmento": ""|"A1"|"A2"|"A3"|"A4",
    "numDipendenti": "es. 12",
    "fatturatoEst": "es. €2M",
    "percWorkwear": ""|"<5%"|"5-15%"|"15-30%"|">30%"|"Non dichiarato",
    "brandAttuali": ["solo brand da questa lista: ${BRANDS.join(', ')}"],
    "brandDominante": "brand principale citato",
    "dpiCatIII": ""|"no"|"soloScarpe"|"siParziale"|"siCompleto",
    "reclamiResi": ""|"no"|"si",
    "reclamiMotivo": "...",
    "painPoints": ["solo da questa lista esatta: ${painList.map(p => `"${p}"`).join(', ')}"],
    "painPrioritario": "il problema principale emerso",
    "fraseEsatta": "le parole più significative del cliente, virgolette",
    "prodottiInteresse": ["solo da questa lista: ${productList.map(p => `"${p}"`).join(', ')}"],
    "competitor": [{"brand": "...", "tone": "positivo|neutro|negativo"}],
    "qualificazione": ${qualShape},
    "noteQualificazione": "...",
    "nextStepData": "azione/data concordata"
  },
  "obiezioni": ${obiezioniShape},
  "riassunto": "2-3 righe che sintetizzano l'esito"
}

Regole: includi SOLO i campi dove hai trovato informazioni concrete. I painPoints devono corrispondere ESATTAMENTE alle stringhe della lista. Per la qualificazione: 1=molto sfavorevole, 5=molto favorevole. Non inventare nulla.`;
  } else {
    return `${baseInstruction}

{
  "profiling": {
    "rsppNome": "...",
    "respAcquisti": "...",
    "numDipendentiTotali": "es. 85",
    "numDipendentiDPI": "es. 60",
    "fatturatoStimato": ""|"<1M€"|"1-5M€"|"5-20M€"|"20-100M€"|">100M€",
    "livelloDPI": ""|"catI"|"catII"|"catIII"|"nonSanno",
    "rischiSpecifici": ["Antifiamma","Arco elettrico","Schizzi metallo fuso","Rischio chimico","Alta visibilità","Lavoro in quota","Freddo / intemperie","Abrasione meccanica"],
    "dvrAggiornato": ""|"si"|"no"|"nonSa",
    "ispezioniRecenti": ""|"no"|"si",
    "ispezioniEsito": "...",
    "fornitoreAttuale": "es. U-Power tramite dealer locale",
    "frequenzaRinnovo": ""|"Quando si rompe"|"Ogni 6 mesi"|"Annuale"|"Contratto quadro"|"Non definita",
    "durataMediaCapo": "es. 8 mesi",
    "spesaDipAnno": "es. €120",
    "lamenteleLavoratori": "...",
    "painPoints": ["solo da questa lista esatta: ${painList.map(p => `"${p}"`).join(', ')}"],
    "painPrioritario": "il problema principale emerso",
    "fraseEsatta": "le parole più significative del cliente",
    "prodottiInteresse": ["solo da questa lista: ${productList.map(p => `"${p}"`).join(', ')}"],
    "qualificazione": ${qualShape},
    "noteQualificazione": "...",
    "nextStepData": "azione/data concordata"
  },
  "obiezioni": ${obiezioniShape},
  "riassunto": "2-3 righe che sintetizzano l'esito"
}

Regole: includi SOLO i campi dove hai trovato informazioni concrete. I painPoints devono corrispondere ESATTAMENTE alle stringhe della lista. Non inventare nulla.`;
  }
}

// ─── Merge helper ─────────────────────────────────────────────────────────────

// ─── Instradamento ────────────────────────────────────────────────────────────

/** Prompt e limite di token per ogni analisi: gli stessi valori usati prima dal browser. */
export function buildAiTask(req: AiTaskRequest): { prompt: string; maxOutputTokens: number } {
  switch (req.type) {
    case 'analizza-resoconto':
      return { prompt: buildResocontoPrompt(req.data), maxOutputTokens: 1024 };
    case 'analizza-resoconti':
      return {
        prompt: buildResocontiPrompt(req.data),
        maxOutputTokens: Math.min(8192, 500 + req.data.items.length * 300),
      };
    case 'analizza-conversazione':
      return {
        prompt: buildConversazionePrompt(req.data.transcript, req.data.isDealer, req.data.contactName),
        maxOutputTokens: 2048,
      };
    case 'verifica-ai':
      return { prompt: 'Rispondi solo con la parola: ok', maxOutputTokens: 32 };
  }
}
