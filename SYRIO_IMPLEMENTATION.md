# SYRIO — implementazione e verifiche

Il tema è applicato al gestionale esistente: accesso, recupero e registrazione, onboarding, dashboard, clienti/prospect con scheda, profilazione, persone/sedi, cronostoria/documenti/foto, pipeline/dettaglio/chiusura, prospecting/sequenze/ordini mensili/suggerimenti, offerte/editor/allegati, catalogo, agenda/ricorrenze/esiti, attività, To Do, mappa/itinerari, strategia, analytics/storico/import/budget, impostazioni/documenti legali, AI/voce/notifiche/aggiornamenti.

## Sistema visivo
Token centralizzati in `src/theme/tokens.css` con tema scuro e chiaro; utilità semantiche Tailwind applicate nei sorgenti delle viste. Wordmark SYRIO / YOUR SALES GUIDE, serif editoriale, superfici antracite, azioni champagne con testo scuro, grafici rame e numeri tabulari. Paesaggio approvato su login e dashboard desktop. Su telefono le prossime azioni precedono KPI e decorazioni. Componenti condivisi per identità, pulsanti, campi, pannelli, dialoghi e conferme; focus visibile, trap tastiera/Escape, reduced motion e preferenze testo conservate.

## Dati e compatibilità
Nessuna migrazione di database o identificativi: chiavi nm_*, next-move-storage, IndexedDB, collezioni/Firebase e deploy conservati. Nome/email del titolare legale conservati. Le modifiche utente preesistenti a App, Settings, Todo, store e types sono preservate; `next-move-mobile/` non è stato modificato. Nessun commit, push o deploy.

## Verifiche
- `npm run build`: TypeScript e build Vite/PWA superati. Rimangono gli avvisi di bundle grande (HEIC), Browserslist e import Legal statico/dinamico.
- `node scripts/syrio-browser-check.mjs after`: Chromium isolato, desktop 1440×1000 e telefono 390×844. Evidenze JSON in `.playwright-cli/syrio/`.
- Quattro flussi reali UI con assert dello stato locale: cliente → offerta salvata; opportunità → esito → prossima azione; appuntamento → esito; CSV → risultati storico.
- Conferma annullata da Escape con dati conservati; focus nel dialogo; tema chiaro e testo grande 19px.
- Screenshot delle 14 destinazioni principali, editor e dialoghi, login/recupero/registrazione/onboarding. 7 verifiche di flusso/interazione superate; 22 controlli responsive senza overflow della pagina o del main, incluso tema chiaro con testo grande su sei sezioni. Nessun errore JavaScript.

## Limiti
Le fixture sono esclusivamente nel browser di verifica: auth e sync intercettati, servizi esterni bloccati, API indisponibili. Non certificano Firebase reale, email/Gmail, AI/trascrizione, map tiles/geocoding/itinerari, pagamenti o dati degli utenti. È verificata l'interfaccia e il salvataggio locale dei quattro flussi richiesti; nessuna richiesta esterna operativa è stata simulata come riuscita. I vecchi screenshot della landing sono esplicitamente indicati come interfaccia precedente. Verifiche visive rappresentative, non ogni combinazione possibile di dati/stati.

## Evidenze
Screenshot e risultati: `.playwright-cli/syrio/`; script riproducibile: `scripts/syrio-browser-check.mjs`. Revisione indipendente Claude (lettura statica e lettura delle evidenze, senza riesecuzione autonoma dei test): `DUO_VERDICT: approved`, nessun rilievo bloccante. Rifiniture applicate a Escape, oggetto email landing e responsive con testo grande; revisione finale e correzioni di contrasto approvate da Claude con `DUO_VERDICT: approved`. Responso effettivo conservato in `Docs/SYRIO/review-finale.json` e `review-contrasto.json`.

Contrasti WCAG calcolati sui token predefiniti: testo/superficie 16,29:1 chiaro e 15,60:1 scuro; muted/superficie 6,34:1 e 7,52:1; testo pulsante/azione 9,69:1; stati pieni almeno 5,86:1. Non è una certificazione di ogni combinazione di classe o palette personalizzata.

Screenshot rappresentativi conservati in `Docs/SYRIO/`: dashboard desktop, atlante delle sezioni mobile, accesso prima/dopo, editor offerta. Presenti anche i risultati JSON e log build.

Verifica mirata aggiuntiva del login chiaro con reduced motion: contrasto didascalia/tagline sulla foto e superficie del pulsante Google verificati tramite CSS calcolato; screenshot in `Docs/SYRIO/accesso-chiaro-mobile.png`.
