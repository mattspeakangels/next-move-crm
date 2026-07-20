# Security Review - 2026-07-20

## Status Summary
- Total Issues: **21**
- Critical: **4** 🔴
- High: **9** 🟠
- Medium: **6** 🟡
- Low: **2** 🟢

### Confronto con review precedente (2026-07-13)
| Metrica | 2026-07-13 | 2026-07-20 | Delta |
|---------|-----------|-----------|-------|
| Totale  | 20        | 21        | +1    |
| Critical | 4        | 4         | 0     |
| High    | 8         | 9         | +1    |
| Medium  | 6         | 6         | 0     |
| Low     | 2         | 2         | 0     |

**Issue fisse dalla review precedente**: 0
**Issue precedenti non risolte**: 20 (tutte)
**Nuove issue questa review**: 1 (#6b — peggioramento netto `npm audit`)

Quarta settimana consecutiva senza alcun fix di sicurezza. `git log` non mostra nessun commit relativo a autenticazione, CORS, rate limiting o SSRF dal 13/07 — solo feature (mappa, agenda, contatti). Tutte le issue del report precedente sono state riverificate leggendo direttamente il codice sorgente attuale e risultano **invariate byte-per-byte** rispetto al 13/07.

---

## Critical Issues 🔴

### #1 — API Token esposto nel bundle frontend *(NON RISOLTO — 4ª settimana consecutiva)*
**File**: `src/hooks/useClaudeAI.ts:23`
```ts
const token = import.meta.env.VITE_ADMIN_API_TOKEN;
```
Invariato. `ADMIN_API_TOKEN` continua a essere incorporato nel bundle JS pubblico e leggibile via DevTools da chiunque visiti l'app. Protegge (parzialmente) `api/claude.ts` e `api/parse-activity.ts`/`api/catalog.ts`, ma essendo pubblico il controllo è puramente estetico.
**Fix**: Migrare ad autenticazione Firebase ID Token lato server (Firebase Admin SDK), eliminando `VITE_ADMIN_API_TOKEN` dal bundle.

---

### #2 — CORS wildcard (`*`) su endpoint AI *(NON RISOLTO — 4ª settimana consecutiva)*
**File**: `api/parse-activity.ts:50`, `api/catalog.ts:50`, `api/scrape-proxy.ts:12`
```ts
res.setHeader('Access-Control-Allow-Origin', '*');
```
Confermato invariato in tutti e tre i file.
**Fix**: Sostituire con `applyCors`/`handleCorsPreFlight` da `api/cors.ts`, come già fatto in `api/claude.ts`.

---

### N1 — SSRF in `blaklader-enrich.ts` *(NON RISOLTO — 3ª settimana consecutiva)*
**File**: `api/blaklader-enrich.ts:162,191`
```ts
const manualUrl = String(req.query.searchUrl ?? '');
...
const r = await fetch(manualUrl, { headers: hdrs });   // nessuna validazione dominio/IP
```
Confermato ancora sfruttabile: `?code=xxxx&searchUrl=http://169.254.169.254/latest/meta-data/iam/security-credentials/` esegue una fetch diretta lato server Vercel e restituisce il body al chiamante. Endpoint **ancora privo di qualsiasi autenticazione** (nessun controllo `authorization`/`ADMIN_API_TOKEN` nel file). CORS resta a origin-reflection (`origin || '*'`, riga 152).
**Fix**: Whitelist domini (`blaklader.it`, `blaklader.com`) + blocco IP literal/private/link-local per `searchUrl`/`domain` + autenticazione token.

---

### N7 — `send-offer-email.ts`: relay email completamente non autenticato *(NON RISOLTO)*
**File**: `api/send-offer-email.ts`
Codice invariato riga per riga rispetto al 13/07: nessun controllo `Authorization`, nessuna verifica CORS, nessun rate limiting. `to`, `subject`, `pdfBase64`, `fromName`, `fromEmail` restano tutti controllabili dal chiamante — chiunque conosca l'URL può inviare email arbitrarie (spam/phishing "NextMove CRM", spoofing mittente entro i domini verificati Resend, consumo quota a pagamento). È l'endpoint aperto più a rischio del progetto ed è rimasto esposto per una settimana intera senza intervento.
**Fix**: Aggiungere auth Bearer token + `checkRateLimit`/`checkRateLimitByIP` + CORS ristretto (pattern identico a `api/claude.ts`); validare `to` come email ben formata; derivare `fromEmail` lato server invece di accettarlo dal client.

---

## High Issues 🟠

### #3 — Rate limiter fail-open su errore Redis *(NON RISOLTO)*
**File**: `api/upstash-ratelimit.ts` (`checkRateLimit`, `checkRateLimitByIP`, `checkRateLimitCustom`)
Invariato: tutti e tre i catch restituiscono `allowed: true` se Upstash è down o non configurato.
**Fix**: Fail-closed con status 503.

### #4 — Race condition TOCTOU nel rate limiter *(NON RISOLTO)*
**File**: `api/upstash-ratelimit.ts:37-90`
Invariato — pattern GET→check→INCR non atomico, sfruttabile con richieste concorrenti per superare il limite.
**Fix**: pattern INCR-first con confronto post-incremento.

### #5 — `parse-activity.ts` e `catalog.ts` senza rate limiting *(NON RISOLTO)*
**File**: `api/parse-activity.ts`, `api/catalog.ts`
Confermato: entrambi controllano il token ma non importano né chiamano mai `checkRateLimit`/`checkRateLimitByIP`. Costo AI illimitato per chi possiede (o intercetta) il token bundlato.

### N2 — `blaklader-enrich.ts` senza autenticazione + DoS amplification *(NON RISOLTO — 3ª settimana)*
**File**: `api/blaklader-enrich.ts:244-261`
Confermato: nessuna auth; fino a ~230 richieste HEAD parallele verso blaklader.it per singola chiamata (array `BLAK_COLORS`), sfruttabile come amplificatore DDoS.

### N3 — `geocode.ts` senza autenticazione e rate limiting *(NON RISOLTO)*
**File**: `api/geocode.ts`
Confermato invariato: nessun check auth, nessun rate limit, nessuna validazione lunghezza di `address`/`city`/`province`.

### N8 — `scrape-proxy.ts`: blocklist SSRF incompleta *(NON RISOLTO)*
**File**: `api/scrape-proxy.ts:32`
```ts
if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) {
```
Confermato invariato: manca `169.254.0.0/16` (metadata service AWS/GCP/Azure), IPv6 (`::1`, `fc00::/7`, `fe80::/10`), e resta un controllo su stringa hostname anziché sull'IP realmente contattato (TOCTOU via DNS). Nessuna auth, CORS wildcard.

### #6b — Vulnerabilità npm: peggioramento significativo *(NUOVO)*
`npm audit` oggi riporta **16 vulnerabilità totali** (1 critical, 7 high, 7 moderate, 1 low) contro le 5 (3 high, 2 moderate) del 13/07 — netto peggioramento, quasi certamente dovuto a un `npm install`/lockfile update che ha portato dentro la catena `vite-plugin-pwa` → `workbox-build` → `websocket-driver` (critical, ReDoS). Dettaglio:
- `websocket-driver` — **CRITICAL**, ReDoS (fix disponibile)
- `@grpc/grpc-js`, `fast-uri`, `serialize-javascript`, `@babel/plugin-transform-modules-systemjs`, `protobufjs`, `xlsx` — **HIGH** (fix disponibile per tutti tranne `xlsx`, che non ha patch upstream per Prototype Pollution/ReDoS)
- `vite`, `vite-plugin-pwa`, `@rollup/plugin-terser`, `brace-expansion`, `react-router`, `react-router-dom`, `workbox-build`, `esbuild` — **MODERATE**
- `@babel/core` — **LOW**
**Fix**: `npm audit fix` per i pacchetti con fix disponibile (la maggior parte); valutare `npm audit fix --force` per `vite`/`vite-plugin-pwa` (major bump, richiede test); migrare `xlsx` → `exceljs` (nessuna patch prevista da SheetJS).

---

## Medium Issues 🟡

### #7 — Firebase API Key nel git history *(invariato, rischio basso)*
Regole Firestore verificate corrette (`allow read, write: if request.auth.uid == userId`).

### #8 — Prompt injection e nessun limite lunghezza in `parse-activity.ts` *(NON RISOLTO)*
**File**: `api/parse-activity.ts:65`
`transcript = body.transcript.trim()` senza `.substring()`/limite né sanitizzazione prima di essere iniettato nel prompt.

### #9 — Dati CRM in chiaro lato client (IndexedDB) *(NON RISOLTO)*
**File**: `src/store/useStore.ts` + `src/lib/idbStorage.ts`
Contatti, trattative, offerte, transazioni e check-in GPS restano in chiaro su IndexedDB (`next-move-db`), senza cifratura né TTL.

### #10 — `resetAll` incompleto *(NON RISOLTO)*
**File**: `src/store/useStore.ts:108`
```ts
resetAll: () => set({ contacts: {}, deals: {}, offers: {}, products: {}, activities: {}, targets: {}, assets: {} }),
```
Confermato: `salesTransactions` e `checkIns` ancora esclusi — dati sensibili (vendite, posizione GPS) sopravvivono a un "reset completo".

### N4 — CORS origin reflection in `blaklader-enrich.ts` *(NON RISOLTO)*
**File**: `api/blaklader-enrich.ts:152`
```ts
res.setHeader('Access-Control-Allow-Origin', origin || '*');
```

### N9 — `geocode.ts`: nessuna validazione lunghezza sui parametri verso servizio terzo *(NON RISOLTO)*
**File**: `api/geocode.ts:11-31`
`address`/`city`/`province` senza limite di lunghezza né charset check prima dell'inoltro a Nominatim.

---

## Low Issues 🟢

### #12 — `sanitizeInput` dead code a 500 char *(NON RISOLTO)*
**File**: `api/claude.ts:100`
Truncation irraggiungibile perché Zod valida già a 200-300 char prima.

### N5+N6 — `catalog.ts`: model ID invalido + logging parziale del token *(NON RISOLTO)*
**File**: `api/catalog.ts:67,88`
`'claude-haiku-4-5'` (senza suffix data) resta come terzo modello fallback; primi 6 caratteri del token loggati in chiaro nei log Vercel (`console.log('[catalog] auth check...`).

---

## Checklist Fix

### Questa settimana (bloccante — 4 settimane di inazione)
- [ ] **N7** — Aggiungere auth + rate limit a `send-offer-email.ts` (30 min, CRITICO — relay email aperto, abuso attivo del budget Resend)
- [ ] **N1** — Whitelist domini + auth su `blaklader-enrich.ts` (30 min, CRITICO — SSRF verso metadata service cloud)
- [ ] **#2** — Sostituire CORS `*` con `applyCors` in `parse-activity.ts`, `catalog.ts`, `scrape-proxy.ts` (45 min, CRITICO)
- [ ] **#6b** — `npm audit fix` per chiudere la vulnerabilità CRITICAL (`websocket-driver`) e le 6 HIGH con fix disponibile (30 min)
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
- [ ] **#6b** — Valutare major bump `vite`/`vite-plugin-pwa` (richiede test regressione build/PWA)
- [ ] **#6** — Migrare `xlsx` → `exceljs` (nessun fix upstream previsto)
- [ ] **#7** — Rotazione Firebase API key esposta nel git history (bassa priorità, regole Firestore corrette)
- [ ] **#9** — Valutare cifratura at-rest dei dati in IndexedDB
- [ ] **N5** — Correggere model ID in `catalog.ts`
- [ ] **N6** — Rimuovere log parziale del token in `catalog.ts`
- [ ] **N9** — Limite lunghezza parametri in `geocode.ts`
- [ ] **#12** — Rimuovere truncation ridondante in `sanitizeInput`

---

## Score: **2/10**

Ulteriore peggioramento rispetto al 3/10 del 13/07. **Zero issue risolte in quattro settimane consecutive**, e questa settimana si aggiunge una vulnerabilità **CRITICAL** nella dependency chain (`websocket-driver`, ReDoS) portando il totale `npm audit` da 5 a 16 vulnerabilità. Nessun commit di sicurezza risulta nel git log da tre review a questa parte: tutto lo sviluppo si è concentrato su nuove feature (mappa, agenda, contatti) mentre `send-offer-email.ts` resta un relay email pubblico senza alcun controllo da oltre una settimana.

**`api/claude.ts`** resta l'unico endpoint con un modello di sicurezza completo (Zod, auth, CORS ristretto, rate limiting doppio).
**`api/send-offer-email.ts`** è il rischio più urgente e a costo diretto: relay email pubblico, zero controlli, esposto da 7+ giorni.
**`api/blaklader-enrich.ts`** resta il secondo rischio più grave: SSRF confermato verso IP interni/metadata service + DoS amplification, invariato da 3 settimane.

## Next Steps — Priorità

1. **Oggi**: Auth + rate limit su `send-offer-email.ts` (N7) — 30 min, blocca abuso attivo del budget email
2. **Oggi**: Fix SSRF `blaklader-enrich.ts` (N1) — whitelist dominio + auth — 30 min
3. **Oggi**: `npm audit fix` per eliminare la vulnerabilità CRITICAL (#6b) — 30 min, zero rischio di breaking change per i pacchetti con fix minor/patch
4. **Questa settimana**: CORS wildcard (#2), auth su `geocode.ts` (N3), blocklist SSRF completa in `scrape-proxy.ts` (N8) — ~2.5h totali
5. **Prossima sprint**: Rimozione token dal bundle frontend (#1) — refactor auth Firebase, 4-6h
6. **Continuo**: Fail-closed rate limiter (#3/#4) — 2h

**Stima effort totale**: ~23-27h dev

**Raccomandazione next agente**: 🔴 **FIX URGENTE, PRIORITÀ ASSOLUTA** — Quattro review consecutive senza un solo fix di sicurezza, mentre un endpoint di invio email è pubblicamente abusabile da oltre una settimana e la superficie SSRF resta aperta verso i metadata service cloud. Raccomando di bloccare temporaneamente `send-offer-email.ts` (anche solo restituendo 501) finché non viene aggiunta l'autenticazione, dato il costo diretto e immediato dell'abuso. Prima di qualsiasi nuova feature, allocare uno sprint dedicato al blocco "Questa settimana" sopra (~4h stimate includendo il fix npm audit), poi procedere con il refactor dell'autenticazione (#1).
