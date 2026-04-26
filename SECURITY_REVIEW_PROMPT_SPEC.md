# Security Review Prompt Specification - Next Move CRM

## Scopo
Questa prompt spec è designata per Claude API per eseguire una **security review completa** del progetto CRM Next Move, identificando rischi di sicurezza, vulnerabilità, e best practices non seguite.

## Contesto Progetto
- **Nome**: Next Move CRM
- **Stack**: React 18 + TypeScript + Vite (frontend) + Vercel Serverless (backend)
- **Integrazioni**: Anthropic Claude API
- **Dati Sensibili**: Info commerciali (clienti, deal, competitor, prezzi)
- **Ambiente**: Pubblico/Web

## PROMPT SPEC DI SECURITY REVIEW

```
Tu sei un security engineer esperto di TypeScript/JavaScript e API security.

Fai una SECURITY REVIEW completa del progetto CRM "Next Move" basato su questi file:

## File da analizzare:

### 1. api/claude.ts
- Handler Vercel per integrazione Claude API
- Riceve richieste POST con tipo e dati
- Chiama Anthropic API con modelli fallback
- Ritorna testi generati (visite, analisi pipeline, email offerta)

### 2. src/hooks/useClaudeAI.ts
- Hook React che chiama /api/claude
- Gestisce loading/error/result state
- Invia dati user al backend senza validazione client-side

### 3. package.json
- Dipendenze del progetto
- Check versioni moduli

### 4. Dati sensibili trattati:
- Company info (aziende clienti, settori, regioni)
- Deal data (importi, stage, probabilità)
- Contact info (nomi, ruoli)
- Competitor intelligence
- Prezzi e condizioni commerciali
- Stakeholder details

---

## ANALYSIS RICHIESTA

### Analizza per:

1. **CORS & Access Control**
   - Header Access-Control-Allow-Origin: * è corretto?
   - Come dovrebbe essere configurato?
   - Rischi CSRF?

2. **Prompt Injection**
   - I dati user sono inseriti direttamente nel prompt?
   - Esempio di attack vector?
   - Come mitigare?

3. **Input Validation**
   - C'è validazione sui dati in input?
   - Quali validazioni mancano?
   - Length limits? Type checks?

4. **Authentication & Authorization**
   - L'endpoint richiede autenticazione?
   - Chi può accedere all'API?
   - Come dovrebbe essere protetto?

5. **Rate Limiting**
   - C'è protezione contro abuse/DoS?
   - Quante richieste per utente?
   - Cost protection (Claude API calls)?

6. **Secrets Management**
   - Come è gestita ANTHROPIC_API_KEY?
   - Rischio di exposure nel code?
   - Log exposure?

7. **Error Handling**
   - Gli errori espongono info sensibili?
   - Come dovrebbero essere gestiti?
   - Logging strategy?

8. **Data Sensitivity**
   - Quali dati sono sensibili?
   - Sono loggati/stored?
   - Encryption necessaria?

9. **Dependencies**
   - Le dipendenze sono aggiornate?
   - Vulnerabilità note?
   - `@anthropic-ai/sdk` versione corretta?

10. **Environment & Deployment**
    - Configurazione Vercel è sicura?
    - Variabili d'ambiente esposte?
    - Build/deploy risks?

---

## FORMAT RISPOSTA

Per ogni categoria:

### [Nome Categoria]
**Status**: 🔴 CRITICO / 🟠 ALTO / 🟡 MEDIO / 🟢 OK

**Descrizione**: Cosa è stato trovato

**Rischio**: Cosa potrebbe succedere

**Esempio Attack**:
\`\`\`
[Codice/scenario di attacco]
\`\`\`

**Fix Raccomandato**:
\`\`\`typescript
[Codice corretto]
\`\`\`

**Sforzo Fix**: [1-5 ore]

---

## PRIORITÀ

1. **BLOCKERS** (fare subito):
   - Security-critical issues che permettono attacks
   
2. **HIGH** (questa release):
   - Vulnerabilità importanti
   
3. **MEDIUM** (prossimo sprint):
   - Best practices non seguite

4. **LOW** (backlog):
   - Miglioramenti futuri

---

## OUTPUT FINALE

Fornisci:

1. **Executive Summary** (2-3 frasi)
2. **Critical Issues** (lista numerata)
3. **Checklist Fix** (cosa deve essere corretto, in ordine priorità)
4. **Timeline** (giorni stima per fix tutto)
5. **Security Score** (1-10, dove 1 è massimo rischio)

---

Analizza il codice dal punto di vista di un attaccante: cosa potrebbe sfruttare?
Considera il business risk: cosa comporta se compromesso?
Sii specifico: non dire "è insicuro", dire CHE COSA è insicuro e COME sfruttarlo.
```

---

## Come Usare Questa Spec

### Via API Claude (Node.js):
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: `[INTERA PROMPT SPEC SOPRA]
      
Analizza questi file:

### api/claude.ts
\`\`\`typescript
[contenuto file]
\`\`\`

### src/hooks/useClaudeAI.ts
\`\`\`typescript
[contenuto file]
\`\`\`

### package.json
\`\`\`json
[contenuto file]
\`\`\`
      `
    }
  ]
});

console.log(response.content[0].type === 'text' ? response.content[0].text : '');
```

### Via Claude Web (claude.ai):
1. Apri claude.ai
2. Copia la PROMPT SPEC completa
3. Aggiungi i file da analizzare
4. Invia e leggi la review

---

## Risultati Attesi

La review dovrebbe identificare:

- ✅ CORS troppo permissivo (`*`)
- ✅ Prompt injection vulnerability (dati non sanitizzati)
- ✅ Mancanza di rate limiting
- ✅ Nessuna autenticazione endpoint
- ✅ Input validation insufficiente
- ✅ Error messages troppo dettagliati
- ✅ Dependency outdated
- ✅ Nessun logging strutturato

---

## Note Aggiuntive

- Questa spec è generica: adatta il prompt se trovi file diversi
- Rirun la review dopo ogni fix critico
- Integra questa review nel CI/CD pipeline
- Update la spec se scopri nuovi vettori d'attacco

---

**Creato**: 2026-04-26  
**Versione Spec**: 1.0
