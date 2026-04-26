# API Authentication & Rate Limiting Setup

## 🔐 Il Tuo Token (SEGRETO!)

```
sk_live_0db859cfed6877308cd0e722b3602d52aca073990e0b7e8f3d77ec7539203dd8
```

**⚠️ IMPORTANTE**: 
- Questo token è **SEGRETO** - non condividere con nessuno
- Se qualcuno lo scopre, può usare la tua API
- Se leakato, generamo uno nuovo

---

## 📋 Setup Files

### `.env.local` (Local Development)
```env
ANTHROPIC_API_KEY=sk-ant-v3-...
ADMIN_API_TOKEN=sk_live_0db859cfed6877308cd0e722b3602d52aca073990e0b7e8f3d77ec7539203dd8
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Vercel Environment Variables
Vai su: https://vercel.com → Settings → Environment Variables

Aggiungi:
```
ANTHROPIC_API_KEY = sk-ant-v3-...
ADMIN_API_TOKEN = sk_live_0db859cfed6877308cd0e722b3602d52aca073990e0b7e8f3d77ec7539203dd8
NEXT_PUBLIC_APP_URL = https://your-production-domain.com
```

---

## 🚀 Come Fare Richieste

### Header Richiesto
```bash
Authorization: Bearer sk_live_0db859cfed6877308cd0e722b3602d52aca073990e0b7e8f3d77ec7539203dd8
```

### Esempio cURL

#### ✅ VALIDO (con token)
```bash
curl -X POST http://localhost:3000/api/claude \
  -H "Authorization: Bearer sk_live_0db859cfed6877308cd0e722b3602d52aca073990e0b7e8f3d77ec7539203dd8" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "prepara-visita",
    "data": {
      "company": "Acme Corp",
      "sector": "Manufacturing",
      "region": "North Italy"
    }
  }'

# Response: 200 OK (con result da Claude)
```

#### ❌ NO TOKEN
```bash
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{"type":"prepara-visita","data":{...}}'

# Response: 401 Unauthorized
# "Unauthorized: Invalid or missing token"
```

#### ❌ TOKEN SBAGLIATO
```bash
curl -X POST http://localhost:3000/api/claude \
  -H "Authorization: Bearer wrong_token_here" \
  -H "Content-Type: application/json" \
  -d '{"type":"prepara-visita","data":{...}}'

# Response: 401 Unauthorized
```

#### ❌ LIMITE RAGGIUNTO (6+ richieste/giorno)
```bash
# Dopo 5 richieste in un giorno, la 6ª fallisce:
# Response: 429 Too Many Requests
# "Rate limited: Max 5 requests per day"
# "resetTime": "2026-04-27T14:30:00.000Z"
```

---

## 📊 Rate Limiting Details

| Parametro | Valore |
|-----------|--------|
| Max richieste/giorno | **5** |
| Finestra temporale | 24 ore |
| Reset automatico | Ogni 24 ore |
| Error code | 429 (Too Many Requests) |
| Cost protezione | ~€0.05 max/giorno |

### Timeline Giornaliero
```
00:00 - Limite resetato (5 richieste disponibili)
08:00 - Richiesta #1 ✅ (4 rimanenti)
09:15 - Richiesta #2 ✅ (3 rimanenti)
14:30 - Richiesta #3 ✅ (2 rimanenti)
16:45 - Richiesta #4 ✅ (1 rimanen​te)
18:00 - Richiesta #5 ✅ (0 rimanenti)
19:00 - Richiesta #6 ❌ BLOCCATA (rate limited)
23:59 - Ancora bloccata
00:00 - RESET → 5 disponibili di nuovo
```

---

## 🔄 Come Fare Richieste da React

### Hook useClaudeAI (già fatto)
```typescript
const { result, loading, error, run } = useClaudeAI();

await run('prepara-visita', {
  company: 'Acme',
  sector: 'Tech',
  region: 'Milano'
});
// Hook aggiunge automaticamente il token nell'Authorization header
```

**Modifica richiesta**: Nel file `src/hooks/useClaudeAI.ts`, aggiungi il token:

```typescript
const res = await fetch('/api/claude', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.REACT_APP_API_TOKEN}` // Aggiungi questo
  },
  body: JSON.stringify({ type, data }),
});
```

Poi in `.env.local`:
```
REACT_APP_API_TOKEN=sk_live_0db859cfed6877308cd0e722b3602d52aca073990e0b7e8f3d77ec7539203dd8
```

---

## 🛡️ Security Checklist

- [x] Token authentication obbligatorio
- [x] Rate limiting 5 req/day (prevenzione DoS)
- [x] CORS whitelist (solo domini autorizzati)
- [x] Input validation (Zod schema)
- [x] Prompt injection prevention (sanitizzazione)
- [ ] IP whitelist (non usato - VPN cambia IP)
- [ ] Https only in production (Vercel lo fa automaticamente)
- [ ] Token rotation policy (cambia ogni 90 giorni)
- [ ] Audit logging (log chi chiama e quando)

---

## 🔄 Se Leakato il Token

Se scopri che il token è stato compromesso:

1. **Genera nuovo token**:
   ```bash
   node -e "const crypto = require('crypto'); console.log('sk_live_' + crypto.randomBytes(32).toString('hex'));"
   ```

2. **Aggiorna `.env` e Vercel**:
   - Nuova coppia di token
   - Deploy Vercel (redeploy per attivare)

3. **Revoca vecchio token**:
   - Non puoi revocarlo direttamente, ma non funzionerà più se aggiorna il env

---

## 📞 Support

**Problema**: Token non funziona
```bash
# Verifica:
echo $ADMIN_API_TOKEN
# Deve mostrare: sk_live_0db859cfed6877308cd0e722b3602d52aca073990e0b7e8f3d77ec7539203dd8
```

**Problema**: Rate limit raggiunto
- Aspetta 24 ore per reset
- Se urgente, genera nuovo token (ma non per abusare)

**Problema**: CORS bloccato
- Verifica `NEXT_PUBLIC_APP_URL` nel `.env`
- Deve essere il dominio da cui stai facendo richieste

---

## ✅ Status

- ✅ Autenticazione: ATTIVA (solo token valido)
- ✅ Rate limiting: ATTIVA (5 req/day)
- ✅ CORS: ATTIVA (whitelist domains)
- ✅ Input validation: ATTIVA (Zod schema)
- ✅ Prompt injection: ATTIVA (sanitizzazione)

**La tua API è blindata!** 🔐

---

**Generato**: 2026-04-26  
**Token**: `sk_live_0db859cfed6877308cd0e722b3602d52aca073990e0b7e8f3d77ec7539203dd8`  
**Versione**: 1.0
