# Security Agents Workflow - Next Move CRM

## 🤖 Panoramica Agenti

Hai 3 agenti remoti che lavorano in cascata per mantenere la sicurezza del tuo CRM:

```
┌─────────────────────────────────────────────────────────────┐
│  AGENTE 1: REVIEW (Automatico - Ogni Lunedì 09:05 AM)       │
│  ├─ Legge il codice                                          │
│  ├─ Analizza rischi di sicurezza                             │
│  └─ Genera report dettagliato SECURITY_REVIEW_[DATE].md      │
└────────────────┬─────────────────────────────────────────────┘
                 │ Report generato ↓
┌────────────────▼─────────────────────────────────────────────┐
│  AGENTE 2: FIX (Manuale - Trigger quando necessario)         │
│  ├─ Legge il report di Review                                │
│  ├─ Implementa i fix di sicurezza                            │
│  ├─ Crea branch security-fixes-[DATE]                        │
│  └─ Apre Pull Request per review                             │
└────────────────┬─────────────────────────────────────────────┘
                 │ Fix implementati ↓
┌────────────────▼─────────────────────────────────────────────┐
│  AGENTE 3: TEST (Manuale - Trigger dopo Fix)                 │
│  ├─ Esegue security tests (auth, injection, CORS, ecc.)      │
│  ├─ Verifica che i fix funzionano                            │
│  ├─ Controlla che non ci siano regressioni                   │
│  └─ Genera report SECURITY_TEST_RESULTS.md                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 Agente 1: REVIEW

### ⏰ Schedule
- **Frequenza**: Automatico
- **Giorno**: Ogni lunedì
- **Ora**: 09:05 AM (ora locale)
- **Prossima esecuzione**: Lunedì prossimo

### 🎯 Cosa Fa
1. Accede al repo del CRM
2. Legge i file critici:
   - `api/claude.ts` (API handler)
   - `src/hooks/useClaudeAI.ts` (React hook)
   - `src/store/useStore.ts` (State)
   - `package.json` (Dipendenze)

3. Analizza 6 categorie di rischi:
   - Injection vulnerabilities
   - Authentication & Authorization
   - Input Validation
   - Rate Limiting & DoS
   - Error Handling
   - Dependencies

4. Genera file: `SECURITY_REVIEW_[DATE].md`

### 📤 Output
- Report markdown con tutti i rischi trovati
- Severity score per ogni issue
- Fix proposti
- Checklist azioni

### 👉 Prossima Azione
Leggi il report e decidi se triggerare l'**Agente Fix**

---

## 🔧 Agente 2: FIX

### ⏰ Schedule
- **Frequenza**: Manuale (su richiesta)
- **Trigger**: Quando vuoi implementare i fix
- **Duration**: 4-6 ore
- **Output Branch**: `security-fixes-YYYYMMDD`

### 🎯 Cosa Fa
1. Crea un branch isolato per i fix
2. Implementa fix in ordine di priorità:

   **CRITICAL (subito)**:
   - ✅ Aggiungi authentication bearer token
   - ✅ Sanitizza input (prompt injection prevention)
   - ✅ Ristringe CORS (whitelist domini)
   - ✅ Implementa rate limiting

   **HIGH (settimana 1)**:
   - ✅ Aggiungi input validation (Zod)
   - ✅ Migliora error handling

   **MEDIUM (settimana 2)**:
   - ✅ Aggiorna dipendenze
   - ✅ Aggiungi structured logging

3. Installa dipendenze necessarie:
   - `zod` (validation)
   - `@upstash/ratelimit` (rate limiting)
   - `winston` (logging)

4. Testa ogni fix localmente

5. Crea Pull Request su GitHub con:
   - Descrizione dettagliata
   - Lista fix implementati
   - Ready for Agente Test

### 📤 Output
- Branch `security-fixes-[DATE]`
- Pull Request su GitHub
- Test results locali

### 👉 Come Triggerare
Vai nella sidebar → Scheduled → `next-move-crm-security-fix` → Run Now

---

## ✅ Agente 3: TEST

### ⏰ Schedule
- **Frequenza**: Manuale (dopo Fix agente)
- **Trigger**: Quando i fix sono implementati
- **Duration**: 2-3 ore
- **Output File**: `SECURITY_TEST_RESULTS.md`

### 🎯 Cosa Fa
Esegue 6 tipi di test di sicurezza:

```
1. AUTHENTICATION TESTS
   ✅ No token → deve fallire (401)
   ✅ Invalid token → deve fallire (401)
   ✅ Valid token → deve passare (200)

2. INPUT SANITIZATION TESTS
   ✅ Newlines in input → sanitizzati
   ✅ Prompt injection → bloccata
   ✅ Very long input → troncato

3. CORS TESTS
   ✅ Allowed origin → accettato
   ✅ Disallowed origin → bloccato

4. RATE LIMITING TESTS
   ✅ 10 requests OK
   ✅ 15+ requests → 429 (Too Many Requests)

5. INPUT VALIDATION TESTS
   ✅ Invalid type → 400 (Bad Request)
   ✅ Missing fields → 400 (Bad Request)

6. REGRESSION TESTS
   ✅ API still works
   ✅ Responses still valid
```

### 📤 Output
- Report `SECURITY_TEST_RESULTS.md` con:
  - ✅/❌ per ogni test
  - Issues trovati (se esistono)
  - Approved for deployment? (Yes/No)

### 👉 Come Triggerare
1. Dopo che Agente Fix ha creato la PR
2. Sidebar → Scheduled → `next-move-crm-security-test` → Run Now

---

## 📊 Workflow Completo

### Fase 1: Setup Iniziale
```
🏁 Start → Agente Review esegue prima review
           (Lunedì prossimo automaticamente)
           ↓
           Leggi SECURITY_REVIEW_[DATE].md
```

### Fase 2: Implementare Fix
```
📋 Hai un report con rischi
   ↓
   Tu: Decidi di implementare fix
   ↓
   Tu: Triggi Agente Fix → Run Now
   ↓
   🔧 Agente Fix lavora (4-6 ore)
   ├─ Crea branch
   ├─ Implementa fix
   ├─ Testa localmente
   └─ Apre PR su GitHub
```

### Fase 3: Validare Fix
```
🔧 Fix implementati
   ↓
   Tu: Triggi Agente Test → Run Now
   ↓
   ✅ Agente Test esegue test
   ├─ Authentication test
   ├─ Injection test
   ├─ CORS test
   ├─ Rate limit test
   ├─ Validation test
   └─ Regression test
   ↓
   📊 Leggi SECURITY_TEST_RESULTS.md
   ↓
   ✅ Se tutto OK → Approva PR e merge
   ❌ Se fallisce → Agente Fix itera
```

### Fase 4: Monitoraggio Continuo
```
✅ Merge completo
   ↓
   📅 Ogni lunedì 09:05 AM:
   ├─ Agente Review esegue
   ├─ Genera nuovo report
   └─ Segnala se nuovi rischi trovati
   ↓
   Se rischi → Torna a Fase 2
   Se OK → Continua monitoraggio
```

---

## 🚀 Come Usare gli Agenti

### Step 1: Aspetta la Prima Review (Lunedì)
L'Agente Review girerà automaticamente lunedì mattina.

```
📬 Notifica riceverai quando finisce
👁️ Apri: /Users/dottmatt/Desktop/'CLAUDE COWORK'/next-move-crm/SECURITY_REVIEW_*.md
📊 Leggi il report
```

### Step 2: Trigga Agente Fix
Quando vuoi implementare i fix:

```
1. Vai nella sidebar di Claude Code
2. Sezione "Scheduled" (in basso)
3. Seleziona "next-move-crm-security-fix"
4. Clicca "Run Now"
5. Aspetta 4-6 ore che lavori
```

### Step 3: Trigga Agente Test
Quando i fix sono pronti:

```
1. Sidebar → "Scheduled"
2. Seleziona "next-move-crm-security-test"
3. Clicca "Run Now"
4. Aspetta 2-3 ore che testi
5. Leggi SECURITY_TEST_RESULTS.md
```

### Step 4: Approva e Deploy
Se tutti i test passano:

```
1. Vedi APPROVED FOR DEPLOYMENT ✅
2. Vai su GitHub
3. Approva la Pull Request
4. Merga in main
5. Deploy a Vercel
```

---

## 📊 Monitoring

### Come Monitorare i Risultati

**Report Review**:
```
📁 /Users/dottmatt/Desktop/'CLAUDE COWORK'/next-move-crm/SECURITY_REVIEW_[DATE].md
```
- Numero total issues (Critical/High/Medium/Low)
- Top 3 priority items
- Effort estimate per fix

**Report Test**:
```
📁 /Users/dottmatt/Desktop/'CLAUDE COWORK'/next-move-crm/SECURITY_TEST_RESULTS.md
```
- ✅/❌ per ogni test category
- Issues trovati
- Approved for deployment?

---

## ⚙️ Configurazione Richiesta

### Per il Tuo Progetto

**1. Aggiungi token di autenticazione in `.env`**:
```bash
# Vercel/.env
ANTHROPIC_API_KEY=sk-...
CLAUDE_CLIENT_TOKEN=your-secret-random-token-here

# Upstash (per rate limiting)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# JWT Secret (se vuoi JWT auth)
JWT_SECRET=your-jwt-secret-here
```

**2. Setup Upstash** (per rate limiting):
- Vai a https://upstash.com
- Crea free Redis database
- Copia `UPSTASH_REDIS_REST_URL` e token
- Aggiungi a `.env`

**3. Verifica Git Remote**:
```bash
cd /Users/dottmatt/Desktop/'CLAUDE COWORK'/next-move-crm
git remote -v
# Deve mostrare origin su GitHub
```

---

## 📈 Timeline Realistica

| Settimana | Evento | Durata |
|-----------|--------|--------|
| Sett. 1 | Lunedì 09:05 AM | Agente Review genera report (30 min) |
| Sett. 1 | Martedì | Tu leggi report (30 min) |
| Sett. 1 | Mercoledì | Tu triggeri Agente Fix (4-6 ore) |
| Sett. 1 | Giovedì | Tu triggeri Agente Test (2-3 ore) |
| Sett. 1 | Venerdì | Revisione e merge PR (1-2 ore) |
| **Sett. 2+** | **Ogni Lunedì** | **Agente Review esegue automaticamente** |

**Timeline Totale**: ~1-2 settimane per eliminare tutti i rischi CRITICAL/HIGH

---

## 🆘 Troubleshooting

### Agente Review non ha generato report

**Possibile causa**:
- Permessi insufficienti per accedere alla cartella
- Path del progetto cambiato

**Fix**:
```bash
# Verifica che il path è corretto
ls /Users/dottmatt/Desktop/'CLAUDE COWORK'/next-move-crm/api/claude.ts

# Se path diverso, aggiorna gli agenti
```

### Agente Fix non riesce a fare commit

**Possibile causa**:
- Git config mancante
- Remote non configurato

**Fix**:
```bash
cd /Users/dottmatt/Desktop/'CLAUDE COWORK'/next-move-crm
git config user.email "you@example.com"
git config user.name "Your Name"
git remote -v  # Verifica origin
```

### Agente Test fallisce

**Possibile causa**:
- Server locale non in running
- Port occupato

**Fix**:
```bash
cd /Users/dottmatt/Desktop/'CLAUDE COWORK'/next-move-crm
npm install
npm run dev  # Avvia server locale
```

---

## 📞 Notes

- Gli agenti sono **completamente autonomi** - non chiedono il tuo input durante l'esecuzione
- Ogni agente **logs tutto** quello che fa
- Puoi **stoppare un agente** in qualsiasi momento via sidebar
- I risultati sono **salvati su disco** - puoi sempre consultarli dopo

---

**Creato**: 2026-04-26  
**Versione**: 1.0  
**Status**: ✅ Agenti configurati e pronti all'uso
