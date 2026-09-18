# Security Review - 2026-09-18

## Status Summary
- Total Issues: 16 (tutti carried, zero nuovi, zero risolti)
- Critical: 3 🔴
- High: 5 🟠
- Medium: 4 🟡
- Low: 4 🟢

**Undicesima review consecutiva senza un solo commit di sicurezza.** Dall'ultima review (07/09) ci sono stati 4 commit (`562b83dc`, `8b51f76b`, `97ee1065`, `154bb37a`), tutti relativi a feature (fix geocoding province, "Offerte&Ordini" come home, ordinamento ricerca clienti, SearchDropdown per selezione clienti) — nessun tocco ai file di sicurezza. Tutti i 16 issue precedenti sono stati riverificati riga per riga su `api/send-offer-email.ts`, `api/blaklader-enrich.ts`, `api/scrape-proxy.ts`, `api/catalog.ts`, `api/parse-activity.ts`, `api/geocode.ts`, `api/upstash-ratelimit.ts` e `src/store/useStore.ts` e restano presenti, identici byte-per-byte. `npm audit` è **peggiorato lievemente**: 22 vulnerabilità (2 low, 8 moderate, 11 high, 1 critical) contro le 21 della scorsa review (+1 moderate, nuova voce `serialize-javascript` via `@rollup/plugin-terser`/`workbox-build`, fix disponibile). `websocket-driver` (CRITICAL) e `xlsx` (HIGH, senza fix upstream) confermati invariati.

## Critical Issues

### C1 (ex-N7) — `api/send-offer-email.ts`: relay email pubblico, zero controlli *(NON RISOLTO — 9+ settimane)*
**File**: `api/send-offer-email.ts:4-47`

Confermato oggi, invariato byte-per-byte: nessuna `applyCors`, nessun controllo `Authorization`, nessun rate limit. `to`, `fromName`, `fromEmail` arrivano interi dal body senza validazione di formato (solo un check di presenza a riga 19). Chiunque conosca l'URL Vercel può inviare email arbitrarie (con allegato PDF a piacere) tramite l'account Resend dell'utente.
**Fix proposto** (invariato): applicare il pattern di `api/claude.ts` — `applyCors`, `Authorization: Bearer ADMIN_API_TOKEN`, `checkRateLimitByIP` + `checkRateLimit`, validazione Zod di `to`/`fromEmail` (formato email) e whitelist domini mittente verificati su Resend.

### C2 (ex-N1) — `api/blaklader-enrich.ts`: SSRF via `manualUrl`/`domain` *(NON RISOLTO — 9+ settimane)*
**File**: `api/blaklader-enrich.ts:152-291`

Confermato: `Access-Control-Allow-Origin: origin || '*'` (riga 152), nessuna auth, nessun rate limit. `manualUrl` (da `req.query.searchUrl`) va in `fetch()` senza whitelist né blocco IP privati/link-local (riga 191: `const r = await fetch(manualUrl, { headers: hdrs });` — nessun `redirect: 'manual'` su questa chiamata, a differenza di altre nello stesso file che lo usano). Il ramo automatico accetta ancora domini tipo `evil.com/blaklader` (controllo `.includes('blaklader')` bypassabile).
**Rischio**: SSRF verso `169.254.169.254` (metadata cloud) o rete interna Vercel; endpoint pubblico usabile come DoS amplifier.
**Fix proposto** (invariato): whitelist rigida di host consentiti, blocco IP privati/link-local prima del fetch (anche dopo redirect), auth token + rate limit come su `api/claude.ts`.

### C3 (ex-#6b) — Vulnerabilità dependency CRITICAL invariata: `websocket-driver` *(NON RISOLTO — 9+ settimane)*
**File**: `package-lock.json`

`npm audit` riporta ora **22 vulnerabilità** (2 low, **8 moderate** ↑ da 7, 11 high, **1 critical**) — la CRITICAL resta `websocket-driver <=0.7.4` (GHSA-mp7j-qc5w-4988 + GHSA-xv26-6w52-cph6), fix disponibile via `npm audit fix`, mai eseguito da almeno 11 settimane. Nuova voce moderate: `serialize-javascript <=7.0.4` (RCE via RegExp.flags/toISOString, DoS) trascinata da `@rollup/plugin-terser` → `workbox-build`, anch'essa con fix disponibile via `npm audit fix`. `xlsx` resta high-severity **senza fix upstream disponibile** (prototype pollution GHSA-4r6h-8v6p-xvw6 + ReDoS GHSA-5pgg-2g8v-p4x9).

## High Issues

### H1 (ex-#2) — CORS wildcard su 3+ endpoint *(NON RISOLTO)*
Verificato oggi: `api/catalog.ts:50`, `api/parse-activity.ts:50`, `api/scrape-proxy.ts:12` hanno tutti ancora `Access-Control-Allow-Origin: '*'` invece di `applyCors()`. `api/blaklader-enrich.ts:152` idem con `origin || '*'`.

### H2 (ex-N8) — `api/scrape-proxy.ts`: SSRF blocklist parziale, non completa *(NON RISOLTO)*
Confermato: la blocklist IP privati (riga 32: `localhost`, `127.`, `10.`, `172.16-31.`, `192.168.`) non copre ancora il range **link-local `169.254.0.0/16`** (metadata service AWS/GCP/Vercel a `169.254.169.254`). `fetch()` è ancora chiamato con `redirect: 'follow'` (riga 44): un redirect verso un IP interno bypassa il controllo (DNS-rebinding / redirect-based SSRF). Manca ancora auth e rate limit.
**Fix proposto** (invariato): aggiungere `169.254.` alla regex di blocco; passare a `redirect: 'manual'` e ri-validare l'hostname ad ogni hop; aggiungere auth + rate limit.

### H3 (ex-N2/N3) — `api/blaklader-enrich.ts` e `api/geocode.ts`: nessuna autenticazione *(NON RISOLTO)*
`api/geocode.ts` confermato oggi (file riletto integralmente, 49 righe): zero controllo `Authorization`, zero `applyCors`, zero rate limit. Endpoint pubblico GET che chiunque può usare per esaurire quota/reputazione su Nominatim (OpenStreetMap) a nome dell'app.

### H4 (ex-#5) — `api/parse-activity.ts` e `api/catalog.ts`: nessun rate limiting *(NON RISOLTO)*
Confermato: entrambi hanno auth token ma zero chiamate a `checkRateLimit`/`checkRateLimitByIP`. Un token valido (che è comunque nel bundle frontend, vedi H5) permette chiamate illimitate ai modelli AI a pagamento.

### H5 — `VITE_ADMIN_API_TOKEN` esposto nel bundle frontend *(NON RISOLTO — invariato da inizio review)*
**File**: `src/hooks/useClaudeAI.ts:23` e altri punti già noti.
Confermato oggi: il token "auth" continua a essere una variabile `VITE_*`, quindi visibile in chiaro nel bundle JS pubblico. L'intera protezione reale rimane il rate limit per-IP/per-token, non l'autenticazione.
**Fix proposto** (invariato, richiede refactor 4-6h): Firebase ID Token verificato server-side o endpoint di scambio token con login utente.

## Medium Issues

- **M1 (ex-#3)** — Confermato: tutte le funzioni in `api/upstash-ratelimit.ts` (`checkRateLimit`, `checkRateLimitByIP`, `checkRateLimitCustom`) falliscono *open* su qualunque errore Redis — se Upstash è irraggiungibile la richiesta passa comunque.
- **M2 (ex-#4)** — Confermato: pattern GET poi INCR non atomico in tutte e tre le funzioni di rate limit — race condition possibile con richieste concorrenti.
- **M3 (ex-N5/N6)** — Confermato in `api/catalog.ts:88`: `models = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-haiku-4-5']` — il terzo fallback `'claude-haiku-4-5'` manca il suffisso data, ID probabilmente invalido. Riga 67 continua a loggare `token.substring(0,6)` in chiaro nei log Vercel a ogni richiesta.
- **M4 (ex-#10)** — Confermato in `src/store/useStore.ts:142`: `resetAll()` continua a non includere `salesTransactions` e `checkIns` (definiti a righe 12/14, gestiti a righe 267-285, persistiti a righe 359/361) nel reset, lasciando dati residui dopo un "ripristina tutto".

## Low Issues

- **L1 (ex-#12)** — `sanitizeInput()` in `api/claude.ts:109-116` tronca ancora a 500 char dopo che Zod ha già validato limiti più stringenti — troncamento morto, nessun impatto pratico.
- **L2 (ex-#7)** — Chiave API Firebase storica nel git history, rischio basso invariato (regole Firestore corrette).
- **L3** — `SECRETS_MANAGEMENT.md.save` presente in root (permessi `600`, non tracciato in HEAD — confermato oggi con `git status --porcelain` e `git check-ignore`, nessuna delle due dà output: il file non è né modificato né ignorato, semplicemente non fa parte dell'albero corrente). Resta nel commit storico `3a2920b8` (5 maggio, 367 righe).
- **L4** — Invariato dalla scorsa review: contenuto di `SECRETS_MANAGEMENT.md.save` **ancora non ispezionato** (policy anti-esfiltrazione della sessione automatizzata resta valida). Nessuna conferma risulta essere arrivata da un umano da almeno quattro settimane. Va trattato come potenzialmente contenente credenziali reali finché non verificato; se lo è, considerarle **compromesse** (presenti nello storico git) e ruotarle a prescindere dal contenuto locale.

## Checklist Fix

### Questa settimana (bloccante — ormai 9+ settimane di inazione totale su C1/C2/C3)
- [ ] **C1** — Auth + rate limit + validazione email su `send-offer-email.ts` (30 min, CRITICO — costo diretto attivo)
- [ ] **C2** — Whitelist domini + blocco SSRF su `blaklader-enrich.ts` (45 min, CRITICO)
- [ ] **C3** — `npm audit fix` per `websocket-driver` (CRITICAL) e `serialize-javascript` (nuovo, MODERATE) (15 min, fix disponibili senza breaking change segnalato)
- [ ] **L4** — Un umano ispeziona `SECRETS_MANAGEMENT.md.save` (locale e nel commit `3a2920b8`); se contiene segreti reali, ruotarli e ripulire lo storico git con `git filter-repo`/BFG (30-60 min)
- [ ] **H1** — Sostituire CORS `*` con `applyCors()` in `catalog.ts`, `parse-activity.ts`, `scrape-proxy.ts`, `blaklader-enrich.ts` (45 min)
- [ ] **H2** — Estendere blocklist SSRF in `scrape-proxy.ts` a `169.254.0.0/16` + passare a `redirect: 'manual'` con ri-validazione per-hop (1h)
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
- [ ] Valutare aggiornamento `@rollup/plugin-terser`/`workbox-build` (ora anche per fix `serialize-javascript`)
- [ ] L1 — rimuovere truncation ridondante in `sanitizeInput`

## Score: **2/10**

Invariato per l'ottava review di fila. I 4 commit dell'ultima settimana e mezza sono feature pure (home su Offerte&Ordini, ordini reversibili, ricerca clienti per rilevanza, SearchDropdown), zero tocchi a codice di sicurezza. Gli issue critical e high restano identici byte-per-byte da 9+ settimane, e `npm audit` è leggermente peggiorato (22 vulnerabilità contro 21, nuova moderate da `serialize-javascript`) senza che nessun fix — nemmeno quelli meccanici via `npm audit fix` — sia mai stato applicato. Nessuna traccia di verifica umana su L4 (`SECRETS_MANAGEMENT.md.save`), ormai in sospeso da oltre un mese. `api/claude.ts` resta l'unico endpoint con un modello di sicurezza completo (Zod + auth + CORS ristretto + doppio rate limit); il divario con gli altri sei endpoint pubblici in `api/` resta invariato e continua a crescere in termini di "settimane di esposizione accumulate".

## Next Steps

1. **Oggi**: `npm audit fix` (C3) — 15 min, elimina la CRITICAL `websocket-driver` e la nuova MODERATE `serialize-javascript` nella dependency chain.
2. **Oggi**: un umano apre `SECRETS_MANAGEMENT.md.save` e verifica se contiene credenziali reali (L4) — la sessione automatizzata non può ispezionarne il contenuto per policy, per la quarta settimana di fila senza risposta.
3. **Oggi**: valutare disabilitare temporaneamente `send-offer-email.ts` (`return res.status(501)`) finché C1 non è implementato — relay email pubblicamente abusabile da oltre 9 settimane.
4. **Questa settimana**: C1, C2, H1-H4 — ~5h totali, tutti fix meccanici che replicano il pattern già esistente in `api/claude.ts`/`api/cors.ts`.
5. **Prossima sprint**: H5 (refactor auth Firebase, 4-6h) — unico fix che richiede design.

**Stima effort totale**: ~10-12h dev + 30-60 min per L4 se conferma segreti reali da ruotare.

**Raccomandazione next agente**: 🔴 **FIX URGENTE, PRIORITÀ ASSOLUTA — invariata da undici review consecutive.** Undici cicli settimanali di review senza un solo commit di sicurezza (l'attività di sviluppo nel frattempo continua su feature, a conferma che il progetto è vivo — solo la sicurezza è ferma), con relay email pubblico e superficie SSRF verso metadata cloud entrambi esposti da oltre nove settimane, più il file "SECRETS_MANAGEMENT" nello storico git tuttora mai verificato da un umano e `npm audit` in leggero peggioramento. I fix meccanici C1-C3 e H1-H4 (~5h) chiuderebbero 7 degli 8 issue critical+high aperti senza rischio di conflitto con le feature in corso. La verifica di L4 richiede intervento umano diretto, non delegabile a questa review automatizzata — resta silenziosamente in sospeso da oltre un mese.
