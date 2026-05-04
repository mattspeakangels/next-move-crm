# Privacy Policy — Next Move CRM

**Ultimo aggiornamento**: 5 maggio 2026

## 1. Chi raccoglie i dati?

Next Move CRM è sviluppato da **Mattia Parlangeli** (persona fisica).
- **Email**: parlangeli.mattia@gmail.com
- **Utilizzo**: Sviluppo e testing dell'app

---

## 2. Quali dati raccolgo?

### Dati che tu inserisci volontariamente:
- Nome, email, numero di telefono (tuoi contatti)
- Informazioni su clienti e trattative (aziende, prodotti, prezzi)
- File CSV che importi
- Conversazioni con Claude AI (prompt, risposta)

### Dati raccolti automaticamente:
- **Log errori**: Via Sentry (se si verifica un errore)
  - Timestamp, tipo di errore, user ID (anonimo)
  - Non contiene dati personali
- **Firestore Analytics**: Via Google Firebase
  - Sessioni, device type, OS
  - Non identificabile

---

## 3. Come uso i dati?

| Dato | Uso | Condiviso? |
|---|---|---|
| Contatti clienti | Gestione CRM (solo tu accedi) | No |
| Trattative/Offerte | Analisi AI (Claude vede il testo) | Sì* |
| Log errori | Debugging e miglioramento | No (Sentry) |
| Analytics | Capire come usi l'app | No (Google) |

*Nota su Claude AI: Quando usi "Prepara visita" o "Email offerta", i dati della tua azienda/trattativa vengono inviati a Claude API (Anthropic). Anthropic non salva i dati per addestramento (vedi loro policy: https://www.anthropic.com/legal/privacy).

---

## 4. Dove sono salvati i dati?

- **Database**: Google Firebase (Firestore) — **Europa (us-central1)**
- **Backup**: Google Cloud Storage — **Europa (europe-west1)**
- **Monitoring**: Sentry — **USA**
- **Analytics**: Google Analytics — **USA**

Tutti i server usano **HTTPS** (crittografia in transito).

---

## 5. Quanto tempo li conservo?

- **Dati CRM** (contatti, trattative): Finché non li cancelli tu
- **Log errori**: 30 giorni, poi auto-cancellati
- **Backup Firestore**: 30 giorni, poi auto-cancellati
- **Rate limit logs**: 1 ora, poi auto-cancellati

---

## 6. Diritti GDPR (se sei in UE)

Hai diritto a:
- ✅ **Accesso**: Vedi tutti i tuoi dati (export da Firestore)
- ✅ **Rettifica**: Modifichi i tuoi dati
- ✅ **Cancellazione**: Chiedi di cancellare tutto (diritto all'oblio)
- ✅ **Portabilità**: Estrai i tuoi dati in formato CSV
- ✅ **Opposizione**: Rifiuti tracking/analytics

**Come richiederlo**: Invia email a **parlangeli.mattia@gmail.com** con oggetto "GDPR Request".

---

## 7. Sicurezza

Implementiamo:
- ✅ HTTPS/TLS (crittografia transito)
- ✅ Firebase Security Rules (accesso controllato)
- ✅ Rate limiting (protezione da abusi)
- ✅ Sentry monitoring (rilevamento anomalie)
- ✅ Input validation (protezione da XSS/injection)

---

## 8. Cookie e Tracking

- **Google Firebase**: Usa cookie di sessione (necessari)
- **Sentry**: Usa cookie per session replay (opzionale)
- **Google Analytics**: Tracking anonimo

**Non usiamo** cookie di marketing/advertising.

---

## 9. Terze parti

Dati condivisi con:
| Servizio | Dati | Privacy |
|---|---|---|
| Google Firebase | Contatti, trattative, analytics | https://policies.google.com/privacy |
| Anthropic (Claude) | Prompt/risposta AI | https://www.anthropic.com/legal/privacy |
| Sentry | Log errori | https://sentry.io/privacy/ |
| Google Cloud | Backup, storage | https://policies.google.com/privacy |

---

## 10. Modifiche alla Privacy Policy

Se cambio questa policy, ti avviserò via email (se hai dato il consenso).

---

## 11. Contatti

Per domande sulla privacy:
- **Email**: parlangeli.mattia@gmail.com
- **Risposta entro**: 7 giorni lavorativi

---

## Domande frequenti

**D: I miei dati sono al sicuro?**
R: Sì. Firebase usa crittografia, Google ha certificazioni ISO 27001, e monitoriamo anomalie con Sentry.

**D: Vendete i miei dati?**
R: No. Non vendiamo mai dati. Usiamo solo servizi di cloud (Google, Anthropic) necessari all'app.

**D: Posso cancellare i miei dati?**
R: Sì. Scrivi a parlangeli.mattia@gmail.com e cancello tutto entro 7 giorni.

**D: Cosa succede se l'app chiude?**
R: Tutti i dati rimangono tuoi e completamente cancellabili. Ti contatterò prima di qualsiasi azione.
