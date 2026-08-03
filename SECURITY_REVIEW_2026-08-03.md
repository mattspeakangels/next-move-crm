# Security Review - 2026-08-03

## Status Summary
- Total Issues: 15 (open, carried + new)
- Critical: 3 🔴
- High: 5 🟠
- Medium: 4 🟡
- Low: 3 🟢

**Cinque review consecutive (13/07, 18/06, 20/06, 22/06, 20/07, 03/08) e zero commit di sicurezza da oltre due settimane.** `git log --since=2026-07-20` mostra 30+ commit, tutti feature (Strategia, Prospecting, mappa, calendario) — nessuno tocca `api/`, `.env`, CORS, auth o dipendenze. Ogni issue critica identificata il 20/07 è ancora presente, byte per byte.

## Critical Issues

### C1 (ex-N7) — `api/send-offer-email.ts`: relay email pubblico, zero controlli *(NON RISOLTO — 3+ settimane)*
**File**: `api/send-offer-email.ts:4-47`

Nessuna authorization, nessun CORS check, nessun rate limit. Chiunque conosca l'URL Vercel può inviare email arbitrarie tramite l'account Resend dell'utente, con mittente (`fromName`/`fromEmail`) e allegato PDF a piacere:

```ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.RESEND_API_KEY;
  const { to, subject, pdfBase64, pdfName, fromName, fromEmail } = req.body as {...};
  // nessun controllo su to/fromEmail, nessuna auth, nessun rate limit
  await resend.emails.send({ from: fromName && fromEmail ? `${fromName} <${fromEmail}>` : ..., to: [to], ... });
```

**Rischio**: relay di spam/phishing a costo dell'utente, esaurimento quota Resend, possibile blocklist del dominio mittente.
**Fix proposto**: applicare lo stesso pattern di `api/claude.ts` — `applyCors`, controllo `Authorization: Bearer ADMIN_API_TOKEN`, `checkRateLimitByIP` (es. 10/ora) + `checkRateLimit` per token. Validare `to`/`fromEmail` con Zod (formato email) e whitelist di `fromEmail` sui domini verificati Resend.

### C2 (ex-N1) — `api/blaklader-enrich.ts`: SSRF via `manualUrl`/`domain` *(NON RISOLTO — 3+ settimane)*
**File**: `api/blaklader-enrich.ts:190-204, 213`

Il server esegue `fetch()` su un URL fornito interamente dal client (`req.query.searchUrl`), senza whitelist di dominio né blocco di IP privati/link-local:

```ts
const manualUrl = String(req.query.searchUrl ?? '');
...
if (manualUrl) {
  const r = await fetch(manualUrl, { headers: hdrs });   // <-- SSRF: nessuna validazione
```

Anche il ramo automatico costruisce URL da `req.query.domain` con solo un controllo `.includes('blaklader')` (bypassabile con `evil.com/blaklader`), e non c'è auth né rate limit sull'endpoint (`Access-Control-Allow-Origin: origin || '*'` a riga 152).

**Rischio**: SSRF verso `169.254.169.254` (metadata service cloud), IP interni Vercel/rete privata, o come DoS amplifier verso terzi (12 secondi di fetch paralleli per richiesta, endpoint pubblico e senza auth).
**Fix proposto**: whitelist rigida di domini consentiti (`www.blaklader.it`, eventuali altri domini ufficiali), validare che l'host risolto non sia in range privati/link-local prima del fetch, e aggiungere auth token + rate limit come su `api/claude.ts`.

### C3 (ex-#6b) — Vulnerabilità dependency CRITICAL invariata: `websocket-driver` *(NON RISOLTO — 3+ settimane)*
**File**: `package-lock.json` (via `node_modules/websocket-driver`)

`npm audit` riporta ancora 17 vulnerabilità (1 low, 6 moderate, 9 high, **1 critical**) — stesso conteggio della review del 20/07. La CRITICAL è invariata:
```
websocket-driver  <=0.7.4
Severity: critical
Resource limit bypass via message compression (GHSA-mp7j-qc5w-4988)
Message corruption via abuse of protocol length headers (GHSA-xv26-6w52-cph6)
fix available via `npm audit fix`
```
Fix disponibile con `npm audit fix` (nessun breaking change atteso per questo pacchetto transitivo). Non è mai stato eseguito da almeno 5 settimane.

## High Issues

### H1 (ex-#2) — CORS wildcard su 3 endpoint *(NON RISOLTO)*
**File**: `api/catalog.ts:50`, `api/parse-activity.ts:50`, `api/scrape-proxy.ts:12` — tutti con `Access-Control-Allow-Origin: '*'` invece di `applyCors()` (già disponibile in `api/cors.ts` e usato correttamente in `api/claude.ts`). `api/blaklader-enrich.ts:152` ha una variante equivalente (`origin || '*'`).

### H2 (ex-N8) — `api/scrape-proxy.ts`: nessuna blocklist SSRF *(NON RISOLTO)*
Stesso pattern di C2 ma su endpoint dedicato a scraping generico — nessun blocco di IP privati/metadata service, nessuna whitelist di dominio.

### H3 (ex-N2/N3) — `api/blaklader-enrich.ts` e `api/geocode.ts`: nessuna autenticazione *(NON RISOLTO)*
Entrambi endpoint pubblici senza `Authorization` check né rate limit, invocabili da chiunque per far leva sul budget/quota di servizi terzi (geocoding a pagamento, fetch esterni).

### H4 (ex-#5) — `api/parse-activity.ts` e `api/catalog.ts`: nessun rate limiting *(NON RISOLTO)*
Hanno auth token ma nessuna chiamata a `checkRateLimit`/`checkRateLimitByIP`: un token valido (che è comunque nel bundle frontend, vedi M1) permette chiamate illimitate ai modelli AI a pagamento.

### H5 — `#1`/architetturale: `VITE_ADMIN_API_TOKEN` esposto nel bundle frontend *(NON RISOLTO — invariato da inizio review)*
**File**: `src/hooks/useClaudeAI.ts:23`, `src/hooks/useAICatalog.ts:61`, `src/components/ai/SelectionAI.tsx:81`, `src/components/ai/ConversationRecorder.tsx:429`

Il token usato come "auth" su `api/claude.ts`/`api/catalog.ts`/`api/parse-activity.ts` è una variabile `VITE_*`, quindi compilata in chiaro nel bundle JS servito al browser. Chiunque ispezioni il bundle pubblico ottiene il token valido, rendendo il controllo `token !== validToken` un ostacolo puramente cosmetico contro chi guarda i DevTools. Tutta la protezione reale oggi è il rate limit per-IP/per-token, non l'autenticazione.
**Fix proposto** (richiede refactor, 4-6h): migrare a Firebase ID Token verificato server-side, o introdurre un endpoint di scambio token che richieda login utente.

## Medium Issues

- **M1 (ex-#3)** — Rate limiter fail-open su errore Redis (`api/upstash-ratelimit.ts`, tutte le funzioni `checkRateLimit*`): se Upstash è down o restituisce errore, la richiesta viene comunque permessa. Combinato con H5 (token pubblico), un attaccante che saturi/blocchi Redis bypassa completamente il rate limit.
- **M2 (ex-#4)** — Rate limiter non atomico: GET poi INCR separati (`api/upstash-ratelimit.ts:34-75`) permette race condition con richieste concorrenti che superano il limite dichiarato.
- **M3 (ex-N5/N6)** — `api/catalog.ts`: modello fallback `'claude-haiku-4-5'` con ID probabilmente invalido (manca suffisso data, coerente col pattern `claude-haiku-4-5-20251001` usato in `api/claude.ts:439`) + log parziale del token in chiaro nei log Vercel.
- **M4 (ex-#10)** — `resetAll()` in `src/store/useStore.ts:142` non azzera `salesTransactions` e `checkIns` (introdotti dopo, righe 12/14/118/120), lasciando dati vendita/presenza residui dopo un "ripristina tutto" dalle Impostazioni — problema di igiene dati più che di sicurezza, ma rilevante se il reset è usato per consegnare/pulire un dispositivo.

## Low Issues

- **L1 (ex-#12)** — `sanitizeInput()` in `api/claude.ts:109-116` tronca a 500 char dopo che Zod ha già validato limiti più stringenti (200-300) — troncamento morto, nessun impatto ma codice fuorviante.
- **L2 (ex-#7)** — Chiave API Firebase storica nel git history (già notato come basso rischio: le Firestore rules limitano correttamente l'accesso).
- **L3** — `SECRETS_MANAGEMENT.md.save` in root (permessi `600`, non tracciato — verificato non in git) è un file `.save` residuo di editor; da verificare che non sia mai stato committato in passato (`git log --all --full-history -- SECRETS_MANAGEMENT.md.save` consigliato, non eseguito in questa review per restare in read-only).

## Checklist Fix

### Questa settimana (bloccante — ormai 3+ settimane di inazione su C1/C2/C3)
- [ ] **C1** — Auth + rate limit + validazione email su `send-offer-email.ts` (30 min, CRITICO — costo diretto attivo)
- [ ] **C2** — Whitelist domini + blocco SSRF su `blaklader-enrich.ts` (45 min, CRITICO)
- [ ] **C3** — `npm audit fix` per la CRITICAL `websocket-driver` (15 min, zero rischio breaking)
- [ ] **H1** — Sostituire CORS `*` con `applyCors()` in `catalog.ts`, `parse-activity.ts`, `scrape-proxy.ts`, `blaklader-enrich.ts` (45 min)
- [ ] **H2** — Blocklist SSRF in `scrape-proxy.ts` (1h)
- [ ] **H3** — Auth token su `blaklader-enrich.ts` e `geocode.ts` (30 min)
- [ ] **H4** — Rate limiting su `parse-activity.ts` e `catalog.ts` (1h)

### Prossima sprint
- [ ] **H5** — Rimuovere `VITE_ADMIN_API_TOKEN` dal bundle, migrare a Firebase ID Token (4-6h)
- [ ] **M1** — Fail-closed su errori Redis nel rate limiter (30 min)
- [ ] **M2** — Rendere atomico il rate limiter (1-2h)
- [ ] **M4** — Aggiungere `salesTransactions`/`checkIns` a `resetAll` (5 min)

### Backlog
- [ ] **M3** — Correggere model ID + rimuovere log token in `catalog.ts` (15 min)
- [ ] Migrare `xlsx` → `exceljs` (nessun fix upstream disponibile per ReDoS/prototype pollution)
- [ ] Valutare major bump `react-router` (moderate: open redirect) e `vite`/`vite-plugin-pwa`
- [ ] L1 — rimuovere truncation ridondante in `sanitizeInput`
- [ ] L3 — verificare storia git di `SECRETS_MANAGEMENT.md.save`

## Score: **2/10**

Invariato rispetto al 20/07. Nessun peggioramento (il conteggio `npm audit` è stabile a 17, non cresciuto), ma anche **zero miglioramento**: tutte le criticità sono identiche, stessa riga di codice, dopo cinque cicli di review consecutivi. `api/claude.ts` resta l'unico endpoint con un modello di sicurezza completo (Zod + auth + CORS ristretto + doppio rate limit) — il gap rispetto agli altri sei endpoint in `api/` si allarga a ogni nuova feature che li tocca senza portarli allo stesso standard.

## Next Steps

1. **Oggi**: `npm audit fix` (C3) — 15 min, zero rischio, elimina l'unica CRITICAL nella dependency chain.
2. **Oggi**: Bloccare temporaneamente `send-offer-email.ts` (anche solo `return res.status(501)`) finché non si implementa C1, dato che resta un relay email pubblicamente abusabile da oltre 3 settimane.
3. **Questa settimana**: C1, C2, H1-H4 — stimabili in ~5h totali, tutti fix isolati che replicano pattern già esistenti in `api/claude.ts`/`api/cors.ts`.
4. **Prossima sprint**: H5 (refactor auth Firebase, 4-6h) — l'unico fix che richiede design, tutto il resto è meccanico.

**Stima effort totale**: ~10-12h dev (in calo rispetto alle 23-27h del 20/07 solo perché molte issue sono ormai fix meccanici a basso rischio, non perché la superficie di rischio si sia ridotta).

**Raccomandazione next agente**: 🔴 **FIX URGENTE, PRIORITÀ ASSOLUTA — invariata da tre review.** Cinque cicli settimanali senza un solo commit di sicurezza, con un relay email pubblico e una superficie SSRF verso metadata service cloud entrambi esposti da oltre tre settimane. Il rapporto costo/beneficio del blocco "Questa settimana" (~5h per chiudere 3 CRITICAL + 4 HIGH) è ormai il miglior investimento disponibile sul progetto, a prescindere da qualunque nuova feature in coda.
