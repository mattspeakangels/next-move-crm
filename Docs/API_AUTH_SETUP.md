# Autenticazione e limiti delle API

Le API in `/api` non usano più un token condiviso (il vecchio `ADMIN_API_TOKEN` è stato
eliminato: essendo letto anche dal browser come `VITE_ADMIN_API_TOKEN`, era visibile a chiunque).

## Come funziona

- Ogni richiesta porta l'ID token Firebase dell'utente collegato:
  `Authorization: Bearer <ID token Firebase>`.
- Il client lo aggiunge sempre con `apiAuthHeaders()` (`src/lib/apiAuth.ts`):
  ```ts
  await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await apiAuthHeaders()) }, body });
  ```
- Il server lo verifica con `requireUser` / `verifyUser` (`api/_auth.ts`): firma Google, emittente
  e destinatario uguali al progetto Firebase. Senza token valido risponde 401.
- CORS: solo le origini in `ALLOWED_ORIGINS` (`api/cors.ts`).

## Variabili su Vercel (solo server)

| Variabile | A cosa serve |
|---|---|
| `FIREBASE_PROJECT_ID` | progetto Firebase usato per verificare i token (in mancanza si usa `VITE_FIREBASE_PROJECT_ID`) |
| `GEMINI_API_KEY` | funzioni AI, mai in variabili `VITE_` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | limiti di frequenza |
| `ALLOWED_ORIGINS` | origini ammesse da CORS |

Nessun segreto va in variabili `VITE_`: finiscono nel codice scaricato dal browser.

## Limiti di frequenza

- Analisi AI (`/api/claude`, tipi `analizza-*`, `verifica-ai`): 60 richieste l'ora per utente.
- Le altre API hanno limiti per IP definiti nei singoli file.
- Oltre il limite la risposta è 429.

## Verifica rapida

```bash
# senza accesso: deve rispondere 401 (o 403 da un'origine non ammessa)
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://next-move-crm.vercel.app/api/claude
```
I test automatici sono in `tests/api-security.test.mjs` (`npm run test:api`).
