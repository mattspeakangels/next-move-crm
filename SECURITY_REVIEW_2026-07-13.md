# Security Review - 2026-07-13

> ⚠️ Nota: la review programmata è settimanale (lunedì), ma l'ultima review registrata risale al **2026-06-22** (3 settimane fa). Nessuna review intermedia trovata nel repo.

## Status Summary
- Total Issues: **20**
- Critical: **4** 🔴
- High: **8** 🟠
- Medium: **6** 🟡
- Low: **2** 🟢

### Confronto con review precedente (2026-06-22)
| Metrica | 2026-06-22 | 2026-07-13 | Delta |
|---------|-----------|-----------|-------|
| Totale  | 17        | 20        | +3    |
| Critical | 3        | 4         | +1    |
| High    | 7         | 8         | +1    |
| Medium  | 5         | 6         | +1    |
| Low     | 3         | 2         | -1    |

**Issue fisse dalle review precedenti**: 0
**Issue precedenti non risolte**: 15 (praticamente tutte)
**Nuove issue questa review**: 3 (N7–N9)

Nelle 3 settimane trascorse **nessuna delle 17 issue della review del 22/06 risulta corretta**. Sono stati inoltre trovati 2 endpoint aggiuntivi (`send-offer-email.ts`, `scrape-proxy.ts`) con problemi propri, non coperti dalle review precedenti.

---

## Critical Issues 🔴

### #1 — API Token esposto nel bundle frontend *(NON RISOLTO — 3ª settimana consecutiva)*
**File**: `src/hooks/useClaudeAI.ts:23`
```ts
const token = import.meta.env.VITE_ADMIN_API_TOKEN;
```
Ancora presente. Il token `ADMIN_API_TOKEN` è incorporato nel bundle JS pubblico e leggibile da chiunque via DevTools. È la chiave che sblocca rate limit, endpoint AI a pagamento e (novità di questa review) anche `send-offer-email.ts` se in futuro venisse protetto con lo stesso token.
**Fix**: Migrare ad autenticazione Firebase ID Token lato server (Firebase Admin SDK), eliminando `VITE_ADMIN_API_TOKEN` dal bundle.

---

### #2 — CORS wildcard (`*`) su endpoint AI *(NON RISOLTO — 3ª settimana consecutiva)*
**File**: `api/parse-activity.ts:50`, `api/catalog.ts:50`
```ts
res.setHeader('Access-Control-Allow-Origin', '*');
```
Invariato dalla review del 18/06.
**Fix**: Sostituire con `applyCors`/`handleCorsPreFlight` da `api/cors.ts`, come già fatto in `api/claude.ts`.

---

### N1 (rif.) — SSRF in `blaklader-enrich.ts` *(NON RISOLTO — 2ª settimana consecutiva)*
**File**: `api/blaklader-enrich.ts:161-204`
```ts
const manualUrl = String(req.query.searchUrl ?? '');
...
const r = await fetch(manualUrl, { headers: hdrs });   // nessuna validazione dominio
```
Confermato ancora sfruttabile: `?searchUrl=http://169.254.169.254/latest/meta-data/iam/security-credentials/` esegue una fetch diretta e restituisce la risposta al chiamante. Endpoint tuttora **privo di qualsiasi autenticazione** (verificato: nessun riferimento a `authorization`/`ADMIN_API_TOKEN` nel file).
**Fix**: Whitelist domini (`blaklader.it`, `blaklader.com`) + blocco IP literal/private/link-local per `searchUrl` e `domain` + autenticazione token.

---

### N7 — `send-offer-email.ts`: relay email completamente non autenticato *(NUOVO)*
**File**: `api/send-offer-email.ts`
```ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.RESEND_API_KEY;
  ...
  const { to, subject, pdfBase64, pdfName, fromName, fromEmail } = req.body as { ... };
  ...
  await resend.emails.send({ from, to: [to], subject, html: '...', attachments: [...] });
```
Nessun controllo `Authorization`/token, nessuna verifica CORS, nessun rate limiting. Chiunque conosca l'URL dell'endpoint può inviare email arbitrarie (destinatario, oggetto e allegato a piacere, fino alla dimensione consentita da Resend) usando l'account Resend del progetto — abuso per spam/phishing con mittente "NextMove CRM" e consumo della quota Resend a pagamento. Anche `fromEmail` è controllabile dal chiamante (possibile spoofing del mittente entro i domini verificati su Resend).
**Fix**: Aggiungere lo stesso schema di `api/claude.ts` (auth Bearer token + `checkRateLimit`/`checkRateLimitByIP` + CORS ristretto), validare `to` come email ben formata e whitelistare/derivare `fromEmail` lato server invece di accettarlo dal client.

---

## High Issues 🟠

### #3 — Rate limiter fail-open su errore Redis *(NON RISOLTO)*
**File**: `api/upstash-ratelimit.ts` (tutte e 3 le funzioni: `checkRateLimit`, `checkRateLimitByIP`, `checkRateLimitCustom`)
Invariato. Se Upstash è down, rate limiting disabilitato su tutti gli endpoint che lo usano, incluso il nuovo pattern in `transcribe.ts`.
**Fix**: Fail-closed con status 503.

---

### #4 — Race condition TOCTOU nel rate limiter *(NON RISOLTO)*
**File**: `api/upstash-ratelimit.ts`
Invariato — GET→check→INCR non atomico.
**Fix**: pattern INCR-first.

---

### #5 — `parse-activity.ts` e `catalog.ts` senza rate limiting *(NON RISOLTO)*
**File**: `api/parse-activity.ts`, `api/catalog.ts`
Verificato: entrambi controllano il token ma non chiamano mai `checkRateLimit`/`checkRateLimitByIP`.

---

### N2 (rif.) — `blaklader-enrich.ts` senza autenticazione + DoS amplification *(NON RISOLTO)*
**File**: `api/blaklader-enrich.ts`
Confermato: nessuna auth; probe fino a ~230 richieste HEAD parallele verso blaklader.it per singola chiamata (array `BLAK_COLORS`), utilizzabile come amplificatore DDoS o per esaurire risorse Vercel.

---

### N3 (rif.) — `geocode.ts` senza autenticazione e rate limiting *(NON RISOLTO)*
**File**: `api/geocode.ts`
Confermato invariato: nessun check auth, nessun rate limit, nessuna validazione lunghezza di `address`/`city`/`province`. Rischio di ban IP su Nominatim per abuso.

---

### N8 — `scrape-proxy.ts`: blocklist SSRF incompleta (manca link-local/cloud metadata) *(NUOVO)*
**File**: `api/scrape-proxy.ts:31-34`
```ts
if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) {
  return res.status(403).json({ error: 'Private addresses not allowed' });
}
```
Buon tentativo di mitigazione SSRF, ma la regex **non copre `169.254.0.0/16`** (link-local, incluso `169.254.169.254` usato da AWS/GCP/Azure per i metadata service) né IPv6 (`::1`, `fc00::/7`, `fe80::/10`), né hostname che risolvono a IP privati solo in fase DNS (TOCTOU — il controllo è sulla stringa hostname, non sull'IP effettivamente contattato da `fetch`). L'endpoint non richiede autenticazione ed è raggiungibile da qualunque origine (nessun controllo CORS oltre al wildcard).
**Fix**: Risolvere il DNS prima della fetch e validare l'IP risultante contro una blocklist completa (RFC 1918 + `169.254.0.0/16` + loopback IPv4/IPv6 + ULA IPv6), oppure usare una libreria dedicata (es. `ssrfilter`/`is-ip-private` + resolve-then-check). Aggiungere autenticazione e rate limiting.

---

### #6 — Vulnerabilità npm (aggiornato)
`npm audit` oggi riporta: **3 high, 2 moderate** (era 7 high/7 moderate/1 low il 22/06 — leggero miglioramento, probabilmente da bump automatici di transitive deps, non da intervento diretto):
- `xlsx` (diretta) — Prototype Pollution + ReDoS, **nessun fix disponibile** dall'upstream
- `@grpc/grpc-js` — crash su richiesta malformata (fix disponibile)
- `protobufjs` — DoS ricorsivo su JSON descriptor (fix disponibile)
- `react-router`/`react-router-dom` — open redirect (fix disponibile)

**Fix**: `npm audit fix` per i pacchetti con fix disponibile; valutare migrazione da `xlsx` a `exceljs` (nessuna patch prevista da SheetJS per queste CVE).

---

## Medium Issues 🟡

### #7 — Firebase API Key nel git history *(non verificabile via analisi statica, invariato)*
Vedi Firestore Security Rules (verificate in questa review — vedi sotto): regole corrette (`allow read, write: if request.auth.uid == userId`), quindi rischio rimane basso a condizione che l'auth Firebase resti configurata correttamente.

### #8 — Prompt injection e nessun limite lunghezza in `parse-activity.ts` *(NON RISOLTO)*
**File**: `api/parse-activity.ts:65`
`transcript = body.transcript.trim()` senza `.substring()`/limite e senza sanitizzazione prima di essere iniettato nel prompt. Confermato invariato.

### #9 — Dati CRM in chiaro lato client *(NON RISOLTO — precisazione)*
**File**: `src/store/useStore.ts` + `src/lib/idbStorage.ts`
La review del 22/06 indicava `localStorage`; verificato che lo storage effettivo è **IndexedDB** (`idbStorage.ts`, DB `next-move-db`) tramite `zustand/persist`. Il rischio è concettualmente identico: contatti, trattative, offerte, transazioni e check-in GPS restano in chiaro sul dispositivo, senza cifratura né TTL — qualunque XSS futura o accesso fisico al dispositivo espone l'intero dataset CRM.

### #10 — `resetAll` incompleto *(NON RISOLTO)*
**File**: `src/store/useStore.ts:107`
Confermato: `salesTransactions` e `checkIns` ancora esclusi da `resetAll`.

### N4 (rif.) — CORS origin reflection in `blaklader-enrich.ts` *(NON RISOLTO)*
**File**: `api/blaklader-enrich.ts:152`
```ts
res.setHeader('Access-Control-Allow-Origin', origin || '*');
```
Invariato.

### N9 — `geocode.ts`: nessuna validazione lunghezza sui parametri passati a servizio terzo *(NUOVO, dettaglio di N3)*
**File**: `api/geocode.ts:18-30`
`address`, `city`, `province` vengono concatenati e passati a Nominatim senza limite di lunghezza né charset check. Non è XSS/injection diretta (solo query param URL-encoded verso terzi), ma consente richieste anomale/potenzialmente costose verso il servizio esterno e amplifica il rischio di ban IP già descritto in N3.

---

## Low Issues 🟢

### #12 — `sanitizeInput` dead code a 500 char *(NON RISOLTO)*
**File**: `api/claude.ts:100`
Invariato — truncation irraggiungibile perché Zod valida già a 200-300 char prima.

### N5+N6 (rif.) — `catalog.ts`: model ID invalido + logging parziale del token *(NON RISOLTO)*
**File**: `api/catalog.ts:67,88`
Entrambi confermati invariati: `'claude-haiku-4-5'` (senza suffix data) come terzo modello fallback, e primi 6 caratteri del token loggati in chiaro nei log Vercel.

---

## Checklist Fix

### Questa settimana (bloccante)
- [ ] **N7** — Aggiungere auth + rate limit a `send-offer-email.ts` (30 min, CRITICO — relay email aperto, rischio abuso attivo e costo diretto)
- [ ] **N1** — Whitelist domini + auth su `blaklader-enrich.ts` (30 min, CRITICO)
- [ ] **#2** — Sostituire CORS `*` con `applyCors` in `parse-activity.ts` e `catalog.ts` (30 min, CRITICO)
- [ ] **N8** — Blocklist SSRF completa (169.254.0.0/16 + resolve-then-check) in `scrape-proxy.ts` (1h, HIGH)
- [ ] **N2** — Auth token su `blaklader-enrich.ts` (15 min, HIGH)
- [ ] **N3** — Auth + rate limiting su `geocode.ts` (30 min, HIGH)
- [ ] **#5** — Rate limiting su `parse-activity.ts` e `catalog.ts` (1h, HIGH)

### Prossima sprint
- [ ] **#1** — Rimuovere `VITE_ADMIN_API_TOKEN`, migrare a Firebase ID Token (4-6h)
- [ ] **#3** — Fail-closed su errori Redis nel rate limiter (30 min)
- [ ] **#4** — Rendere atomico il rate limiter (INCR-first) (1-2h)
- [ ] **#8** — Sanitizzare/limitare `transcript` in `parse-activity.ts` (30 min)
- [ ] **#10** — Aggiungere `salesTransactions`/`checkIns` a `resetAll` (5 min)

### Backlog
- [ ] **#6** — `npm audit fix`; valutare migrazione `xlsx` → `exceljs`
- [ ] **#7** — Rotazione Firebase API key esposta nel git history (bassa priorità, regole Firestore corrette)
- [ ] **#9** — Valutare cifratura at-rest dei dati in IndexedDB
- [ ] **N5** — Correggere model ID in `catalog.ts`
- [ ] **N6** — Rimuovere log parziale del token in `catalog.ts`
- [ ] **N9** — Limite lunghezza parametri in `geocode.ts`
- [ ] **#12** — Rimuovere truncation ridondante in `sanitizeInput`

---

## Score: **3/10**

Ulteriore peggioramento rispetto al 3.5/10 del 22/06. Zero issue risolte in 3 settimane; è stato aggiunto un endpoint completamente aperto (`send-offer-email.ts`) che consente l'invio di email arbitrarie tramite l'account Resend del progetto senza alcuna autenticazione — la superficie di abuso più immediata e a costo diretto trovata finora.

**`api/claude.ts`** resta l'unico file con un modello di sicurezza completo (Zod, auth, CORS ristretto, rate limiting doppio).
**`api/send-offer-email.ts`** è oggi il rischio più urgente: relay email pubblico, zero controlli.
**`api/blaklader-enrich.ts`** resta il secondo rischio più grave: SSRF confermato + DoS amplification, invariato da 2 settimane.

## Next Steps — Priorità

1. **Oggi**: Auth + rate limit su `send-offer-email.ts` (N7) — 30 min, blocca abuso attivo del budget email
2. **Oggi**: Fix SSRF `blaklader-enrich.ts` (N1) — whitelist dominio + auth — 30 min
3. **Questa settimana**: CORS wildcard (#2), auth su `geocode.ts` (N3), blocklist SSRF completa in `scrape-proxy.ts` (N8) — ~2.5h totali
4. **Prossima sprint**: Rimozione token dal bundle frontend (#1) — refactor auth Firebase, 4-6h
5. **Continuo**: Fail-closed rate limiter (#3/#4) — 2h

**Stima effort totale**: ~22-26h dev

**Raccomandazione next agente**: 🔴 **FIX URGENTE** — Nessuna delle criticità delle ultime due review è stata affrontata e nel frattempo è comparso un endpoint di invio email totalmente privo di autenticazione. Prima di qualsiasi nuova feature, allocare uno sprint dedicato a chiudere il blocco "Questa settimana" sopra (stima ~3.5h per le prime 4 voci), poi procedere con il refactor dell'autenticazione (#1) che elimina la causa comune di gran parte delle altre issue.
