# Security Review - 2026-06-18

## Status Summary
- Total Issues: **14**
- Critical: **2** 🔴
- High: **5** 🟠
- Medium: **5** 🟡
- Low: **2** 🟢

---

## Critical Issues 🔴

### #1 — API Token esposto nel bundle frontend
**File**: `src/hooks/useClaudeAI.ts:23`  
**Severity**: CRITICAL

```ts
const token = import.meta.env.VITE_ADMIN_API_TOKEN;
```

Le variabili `VITE_*` vengono incorporate nel bundle JavaScript al momento della build e sono leggibili da chiunque con DevTools → Sources. L'autenticazione bearer sul server (`api/claude.ts:274-287`) usa lo stesso token, quindi chiunque apra la console del browser può estrarlo e fare chiamate API illimitate (fino al rate limit), con accesso diretto all'API Anthropic a tuo carico.

**Fix proposto**: Non passare il token tramite variabile VITE. Usare invece una cookie `httpOnly` + sessione Firebase Auth, oppure esporre un proxy API separato autenticato via Firebase ID Token.

```ts
// Invece di VITE_ADMIN_API_TOKEN, usare Firebase Auth:
const user = auth.currentUser;
const idToken = await user.getIdToken();
// Il server verifica il Firebase ID Token (gratis, sicuro, non esposto)
```

---

### #2 — CORS wildcard (`*`) su nuovi endpoint AI
**File**: `api/parse-activity.ts:52` e `api/catalog.ts` (riga analoga)  
**Severity**: CRITICAL

```ts
res.setHeader('Access-Control-Allow-Origin', '*');
```

I due nuovi endpoint (`/api/parse-activity` e `/api/catalog`) sono stati aggiunti senza ereditare il CORS restrittivo di `api/cors.ts`. Qualsiasi sito web, incluso un sito malevolo, può fare richieste cross-origin a questi endpoint. Combinato con l'issue #1 (token nel bundle), un attaccante può costruire un sito che usa il token estratto e chiama liberamente questi endpoint.

**Fix proposto**: Importare e usare `applyCors`/`handleCorsPreFlight` da `api/cors.ts` identicamente a `api/claude.ts:256-265`.

---

## High Issues 🟠

### #3 — Rate limiter fail-open su errore Redis
**File**: `api/upstash-ratelimit.ts:100-108` e `:319-325`  
**Severity**: HIGH

```ts
} catch (error) {
  console.error('Rate limit check failed:', error);
  // Fail open on error (allow request)
  return { allowed: true, remaining: 5, resetAt: ... };
}
```

Se Upstash Redis è irraggiungibile (down, quota esaurita, configurazione mancante), il rate limiting è completamente disabilitato. In quel momento un attaccante può generare traffico illimitato verso l'API Anthropic, con costi potenzialmente elevati. Questo vale sia per il rate limit per token che per IP.

**Fix proposto**: Fail-closed in produzione, cioè restituire `allowed: false` su errore Redis, con un messaggio di errore 503 al client.

---

### #4 — Race condition TOCTOU nel rate limiter
**File**: `api/upstash-ratelimit.ts:37-90`  
**Severity**: HIGH

Le operazioni `GET counter` → `check` → `INCR counter` sono tre chiamate HTTP separate non atomiche. Con richieste concorrenti, N richieste possono passare il check contemporaneamente prima che il counter venga incrementato, bypassando il limite.

**Fix proposto**: Usare `INCR` + `EXPIRE` atomicamente (o la pipeline Redis), poi confrontare il valore risultante col limite:
```
INCR key → valore
if valore == 1: EXPIRE key window
if valore > limit: return not allowed
```

---

### #5 — Nuovi endpoint senza rate limiting
**File**: `api/parse-activity.ts`, `api/catalog.ts`  
**Severity**: HIGH

Entrambi i nuovi endpoint chiamano Claude (Haiku/Sonnet) senza alcun rate limiting. Solo autenticazione token è presente. Un utente con il token (che è già esposto nel bundle) può chiamarli indefinitamente.

**Fix proposto**: Aggiungere `checkRateLimitByIP` e `checkRateLimit` identicamente a `api/claude.ts:295-328`.

---

### #6 — 7 vulnerabilità HIGH in dipendenze npm
**Rilevato da**: `npm audit`

| Pacchetto | Severità | Vulnerabilità |
|-----------|----------|---------------|
| `xlsx` (dipendenza diretta) | HIGH | Prototype Pollution (CVE) |
| `vite` | HIGH | Path Traversal in Optimized Deps |
| `serialize-javascript` | HIGH | RCE via RegExp.flags |
| `@babel/plugin-transform-modules-systemjs` | HIGH | Arbitrary code execution |
| `@grpc/grpc-js` | HIGH | Server crash (DoS) |
| `fast-uri` | HIGH | Path traversal via encoded dots |
| `protobufjs` | HIGH | DoS via recursive descriptor |

**Fix proposto**: `npm audit fix` (per auto-fixable), poi aggiornare manualmente `xlsx` a una versione sicura o valutare l'alternativa `exceljs`.

---

## Medium Issues 🟡

### #7 — Firebase API Key nel git history
**File**: `SECRETS_MANAGEMENT.md.save` (commit `3a2920b8`)  
**Severity**: MEDIUM

La chiave Firebase reale `AIzaSyDQGzNAWk5sa0V8i5Vo88W19cQDpv8_xLo` è presente nel git history pubblico. Anche se le Firebase API key sono semi-pubbliche per design, questa espone il progetto a abusi delle Firebase API (Firestore, Auth, Storage) senza autenticazione se le regole Firestore/Storage non sono correttamente restrittive.

**Fix proposto**: Verificare le Firestore Security Rules (il file `firestore.rules` nel progetto). Valutare di ruotare la Firebase API key dalla Firebase Console.

---

### #8 — Prompt injection in `parse-activity.ts`
**File**: `api/parse-activity.ts:17-20`  
**Severity**: MEDIUM

```ts
return `... MESSAGGIO VOCALE:\n"${transcript}"`;
```

Il transcript vocale è inserito direttamente nel prompt senza sanitizzazione. Un utente malintenzionato potrebbe costruire un transcript che rompe il formato del prompt per far rispondere il modello con JSON arbitrario o per far eseguire istruzioni diverse.

**Fix proposto**: Aggiungere una sanitizzazione base al transcript (rimuovere caratteri di controllo, limitare lunghezza a max 1000 chars). Considerare di delimitare il transcript con un marcatore che non può essere ripetuto dall'input.

---

### #9 — Dati CRM in chiaro nel localStorage
**File**: `src/store/useStore.ts:191-217`  
**Severity**: MEDIUM

Tutti i dati CRM (contatti, trattative, offerte, attività, transazioni di vendita) sono persistiti in `localStorage` in chiaro via Zustand `persist`. Qualsiasi XSS vulnerability (ora o in futuro) consentirebbe il furto completo del CRM. I dati non hanno TTL e rimangono indefinitamente.

**Azione suggerita**: Valutare cifratura del localStorage o migrazione a IndexedDB con crittografia, oppure limitare la persistenza locale ai soli dati non sensibili.

---

### #10 — `resetAll` incompleto
**File**: `src/store/useStore.ts:91`  
**Severity**: MEDIUM

```ts
resetAll: () => set({ contacts: {}, deals: {}, offers: {}, products: {}, activities: {}, targets: {}, assets: {} }),
```

`salesTransactions` e `checkIns` non vengono azzerati da `resetAll`. Un utente che fa "reset" si aspetta di cancellare tutti i dati, ma dati di vendita e geolocalizzazione rimangono.

**Fix proposto**:
```ts
resetAll: () => set({ contacts: {}, deals: {}, offers: {}, products: {}, activities: {}, targets: {}, assets: {}, salesTransactions: {}, checkIns: {} }),
```

---

## Low Issues 🟢

### #11 — Model ID inesistente nel fallback
**File**: `api/claude.ts:358`  
**Severity**: LOW

```ts
const models = ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-6'];
```

`claude-opus-4-6` non è un model ID valido (l'Opus attuale è `claude-opus-4-8`). Il fallback all'ultimo modello fallirà sempre silenziosamente, consumando un tentativo inutile.

---

### #12 — `sanitizeInput` dead code a 500 chars
**File**: `api/claude.ts:89-96`  
**Severity**: LOW

`sanitizeInput` tronca a 500 caratteri, ma Zod valida già i campi a 200-300 caratteri prima che `sanitizeInput` venga chiamato. Il truncation a 500 è quindi un dead code path — non aggiunge protezione reale.

---

## Checklist Fix

- [ ] #1 — Rimuovere VITE_ADMIN_API_TOKEN dal frontend, implementare auth via Firebase ID Token
- [ ] #2 — Aggiungere CORS restrittivo a `parse-activity.ts` e `catalog.ts`
- [ ] #3 — Cambiare fail-open in fail-closed per Redis errors
- [ ] #4 — Rendere atomico il rate limiter con INCR-first pattern
- [ ] #5 — Aggiungere rate limiting a `parse-activity.ts` e `catalog.ts`
- [ ] #6 — `npm audit fix` + aggiornamento manuale `xlsx`
- [ ] #7 — Verificare Firestore Security Rules + considerare rotazione Firebase API key
- [ ] #8 — Sanitizzare input `transcript` in `parse-activity.ts`
- [ ] #9 — Valutare cifratura localStorage o riduzione dei dati persistiti
- [ ] #10 — Aggiungere `salesTransactions: {}` e `checkIns: {}` a `resetAll`
- [ ] #11 — Correggere model ID `claude-opus-4-6` → `claude-opus-4-8`
- [ ] #12 — Rimuovere truncation ridondante da `sanitizeInput` o allineare a 300

---

## Score: **5/10**

La struttura di sicurezza del progetto è solida in `api/claude.ts` (Zod validation, CORS, rate limiting, auth token), ma i due nuovi endpoint agiunti di recente (`parse-activity.ts`, `catalog.ts`) non hanno ereditato le stesse protezioni, abbassando significativamente il punteggio. Il problema critico del token esposto nel bundle rimane irrisolto dalla review precedente.

---

## Next Steps — Priorità

1. **Questa settimana (bloccante)**: Fix #2 (CORS wildcard) — 30 min
2. **Questa settimana**: Fix #5 (rate limiting nuovi endpoint) — 1h
3. **Prossima sprint**: Fix #1 (token nel bundle) — 4-6h, richiede refactor auth
4. **Prossima sprint**: Fix #3 e #4 (rate limiter resilienza) — 2h
5. **Backlog**: Fix #6 (npm audit), #8, #10, #11

**Stima effort totale**: ~12-15h dev

**Raccomandazione next agente**: 🔴 **FIX RICHIESTO** — prioritizzare issue #2 e #5 questa settimana (quick wins ad alto impatto), poi #1 nella prossima sprint.
