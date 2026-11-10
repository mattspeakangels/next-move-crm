# Proposta: Outlook e pipeline assistita

Stato: prova di collegamento implementata localmente, da configurare e validare con responsabile e IT aziendale. Nessun collegamento è attivo.

## Configurazione della prova Outlook

- L'IT registra o approva un'app Microsoft Entra per account organizzativi e configura una piattaforma Single-page application (SPA), con URI di reindirizzamento uguale all'origine esatta dell'app (inclusi schema, host ed eventuale porta).
- Configurare `VITE_MICROSOFT_CLIENT_ID` con l'Application (client) ID prima della build. Il client ID è pubblico; non inserire un client secret nell'app browser.
- Il flusso richiede il permesso Microsoft Graph delegato `Mail.ReadBasic` e usa il consenso consentito dalle policy aziendali. L'IT deve verificare permesso, consenso amministrativo e accesso condizionale.
- In Impostazioni, «Collega Outlook» avvia l'accesso; «Leggi email recenti» mostra oggetto, mittente e data delle ultime 20 email della posta in arrivo. I token restano nella memoria della pagina; ricaricando occorre ricollegarsi. La rimozione dei dati della sessione non revoca il consenso Microsoft: la revoca va effettuata secondo le procedure aziendali.
- La prova non salva email in Next Move, non legge il corpo, non usa AI, non sincronizza posta inviata e non crea trattative. Non è stata verificata su una casella reale.

## Obiettivo

Proporre trattative e prossime azioni a partire dalle conversazioni commerciali della casella aziendale, lasciando all'utente la conferma delle proposte e degli aggiornamenti significativi.

## Prima prova

1. Collegare una sola casella Microsoft 365 con autorizzazione delegata, dopo approvazione aziendale.
2. Leggere posta in arrivo e inviata, per un periodo iniziale da concordare (ipotesi: 30 giorni).
3. Raggruppare i messaggi per conversazione e proporre possibili opportunità nella sezione «Da verificare».
4. Mostrare cliente suggerito, richiesta, fase, prossima azione e riferimenti alle email di origine. I campi incerti restano da verificare.
5. Permettere conferma, modifica o scarto; evitare proposte duplicate per la stessa conversazione e chiedere conferma in caso di abbinamenti ambigui.
6. Collegare le email successive e proporre aggiornamenti; non cambiare automaticamente la fase o creare promemoria senza conferma.

Viste suggerite: Da verificare, Da fare, In attesa, Tutte e Concluse. Fasi iniziali da validare: Da approfondire, Proposta da preparare, Proposta inviata, Trattativa, Vinta/Persa.

## Vincoli e decisioni da approvare

- Microsoft Graph con accesso delegato e permessi minimi di lettura: definire permessi esatti, cartelle, durata e modalità di revoca con l'IT.
- Stabilire se e a quali fornitori AI sia consentito trasmettere il contenuto delle email; senza autorizzazione non inviarlo. Definire anche conservazione, cancellazione, log e posizione dei dati.
- Registrare l'applicazione Microsoft secondo le regole dell'azienda; verificare consenso amministrativo, URL di ritorno e policy di accesso condizionale. Non memorizzare segreti nel codice client.
- Non inviare email, non analizzare allegati e non agire su altre caselle nella prima prova.
- Definire il trattamento dei messaggi scartati, il reset della sincronizzazione, la disconnessione e l'eliminazione dei dati derivati.

## Architettura da dettagliare dopo l'approvazione

Separare connessione/autorizzazione, acquisizione incrementale dei messaggi, generazione delle proposte e conferma dell'utente. Identificare i messaggi tramite identificatori del provider, conservare un riferimento verificabile alla fonte e rendere ripetibile la sincronizzazione senza duplicare attività o proposte. Gestire scadenza del consenso, errori e limiti del servizio mostrando uno stato comprensibile all'utente.

La sincronizzazione Gmail esistente crea attività da metadati: non è una connessione Outlook né un motore di individuazione delle trattative. Il modello di accesso ai dati e la compatibilità con il lavoro workspace in corso vanno verificati prima dell'implementazione.

## Criteri di accettazione

- Senza consenso valido nessun messaggio è letto o trasmesso.
- Un messaggio di prova pertinente produce una proposta con fonte verificabile; un messaggio non pertinente non crea automaticamente una trattativa.
- Conferma, modifica e scarto funzionano; ripetere la sincronizzazione non duplica le proposte.
- Disconnessione, revoca e cancellazione seguono le policy concordate e danno riscontro chiaro.
- I test coprono isolamento fra utenti/workspace, corrispondenze ambigue, errori del provider e ripetizione della sincronizzazione.
