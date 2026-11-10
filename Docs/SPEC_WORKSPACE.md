# SPEC — Spazio aziendale condiviso (workspace)

Stato: implementata sul branch `feat/workspace`, non ancora rilasciata · Autore ed esecutore: Claude
Repo: `gestionalinegozi/next-move-crm` (Syrio)

## 1. Obiettivo

Oggi ogni dato vive sotto `users/{uid}/...`: solo chi l'ha creato lo vede. Syrio deve diventare
un sistema condiviso in cui commerciali, customer service e ufficio personalizzazione vedono gli
stessi clienti, offerte e attività. Questo blocco porta i dati condivisi sotto `workspaces/{wid}/...`
ed è il prerequisito di Progetti, thread email e coda "da smistare" (spec successive).

**Fuori scope di questo blocco:** Progetti/eventi, inoltro email, visibilità per ruolo (tutti i
membri vedono tutto, scelta di prodotto), app `next-move-mobile/` (non toccarla).

## 2. Modello dati

```
userProfiles/{uid}                    { activeWorkspaceId, workspaceIds: string[], email, updatedAt }
workspaces/{wid}                      { name, ownerUid, createdAt }
workspaces/{wid}/members/{uid}        { uid, email, displayName, role, status, joinedAt }
invites/{emailLower}                  { email, wid, workspaceName, role, invitedBy, createdAt }
workspaces/{wid}/<collezioni condivise>/{id}
users/{uid}/<collezioni personali>/{id}      (invariato)
```

`role`: `'owner' | 'admin' | 'sales' | 'customer_service' | 'graphics' | 'bdr'`
`status`: `'active' | 'disabled'`

### Collezioni condivise (→ workspace)
`contacts, deals, offers, products, activities, assets, salesTransactions, checkIns, groups,
strategicFocuses, sequences, storico, storico_dettagliati, offer_pdfs, offer_pdf_chunks,
bi_docs, bi_doc_chunks, contact_photos, contact_photo_chunks, audit_logs`

### Collezioni personali (restano in `users/{uid}`)
`settings` (contiene `claudeApiKey`: non deve MAI finire nel workspace), `todos`, `targets`,
`prospectingTracks`, `prospectEmailDrafts`, `prospectHistory`

### Campi nuovi sui documenti condivisi
- `createdBy: uid`, `updatedBy: uid` — valorizzati automaticamente in scrittura (vedi §4.3).
- Su `contacts` e `deals`: `ownerUid?: uid` (commerciale assegnatario). Default = `createdBy`.
  Nessuna UI di riassegnazione in questo blocco, solo il campo.

## 3. Regole di sicurezza

### firestore.rules (sostituisce l'attuale)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function member(wid) {
      return signedIn()
        && exists(/databases/$(database)/documents/workspaces/$(wid)/members/$(request.auth.uid))
        && get(/databases/$(database)/documents/workspaces/$(wid)/members/$(request.auth.uid)).data.status == 'active';
    }
    function roleIn(wid, roles) {
      return member(wid)
        && get(/databases/$(database)/documents/workspaces/$(wid)/members/$(request.auth.uid)).data.role in roles;
    }

    match /users/{userId}/{document=**} {
      allow read, write: if signedIn() && request.auth.uid == userId;
    }
    match /userProfiles/{userId} {
      allow read, write: if signedIn() && request.auth.uid == userId;
    }
    match /workspaces/{wid} {
      allow read: if member(wid);
      allow create: if signedIn() && request.resource.data.ownerUid == request.auth.uid;
      allow update: if roleIn(wid, ['owner', 'admin']);
      allow delete: if false;

      match /members/{uid} {
        allow read: if member(wid);
        // owner/admin gestiscono i membri; l'invitato può creare SOLO se stesso,
        // SOLO con il ruolo dell'invito; il creatore del workspace crea se stesso owner.
        allow create: if roleIn(wid, ['owner', 'admin'])
          || (signedIn() && uid == request.auth.uid && request.auth.token.email_verified == true
              && exists(/databases/$(database)/documents/invites/$(request.auth.token.email.lower()))
              && get(/databases/$(database)/documents/invites/$(request.auth.token.email.lower())).data.wid == wid
              && request.resource.data.role == get(/databases/$(database)/documents/invites/$(request.auth.token.email.lower())).data.role)
          || (signedIn() && uid == request.auth.uid
              && getAfter(/databases/$(database)/documents/workspaces/$(wid)).data.ownerUid == request.auth.uid
              && request.resource.data.role == 'owner');
        allow update, delete: if roleIn(wid, ['owner', 'admin']);
      }
      match /audit_logs/{id} {
        allow read, create: if member(wid);
        allow update, delete: if false;
      }
      match /{col}/{id} {
        allow read, write: if member(wid) && col != 'members' && col != 'audit_logs';
      }
    }
    // Un solo invito pendente per email (scelta v1).
    match /invites/{email} {
      allow read: if signedIn() && (email == request.auth.token.email.lower()
        || roleIn(resource.data.wid, ['owner', 'admin']));
      allow create: if roleIn(request.resource.data.wid, ['owner', 'admin']);
      allow delete: if signedIn() && (email == request.auth.token.email.lower()
        || roleIn(resource.data.wid, ['owner', 'admin']));
      allow update: if false;
    }
  }
}
```
Note: workspace e membro owner vanno creati nello **stesso batch** (per questo la regola usa
`getAfter`). L'adesione da invito richiede `email_verified`, così nessuno entra registrandosi
con un'email non sua. Per gli account email/password serve quindi la verifica email al login.

### storage.rules
L'attuale regola consente a **qualsiasi utente autenticato** di leggere/scrivere `offers/*`:
con più aziende diventa una fuga di dati. Gli upload attuali usano chunk Firestore, non Storage.
Sostituire con `allow read, write: if false;` e verificare con `grep -rn "firebase/storage" src`
che nulla lo usi. Se qualcosa lo usa, segnalarlo e non procedere su questo punto.

## 4. Refactor client

### 4.1 Contesto workspace
Nuovo `src/lib/workspaceContext.tsx` (`WorkspaceProvider`, `useWorkspace()`):
- Al login legge `userProfiles/{uid}`.
- Se manca, o se esiste `invites/{emailLower}`: legge l'invito; se c'è → crea
  `workspaces/{wid}/members/{uid}` con il ruolo dell'invito, aggiorna `userProfiles/{uid}`
  (aggiunge il wid e lo rende attivo), cancella l'invito.
- Se non c'è nulla → crea workspace "Spazio di {displayName}" con l'utente come `owner`.
- Espone `{ workspaceId, role, members, switchWorkspace(wid) }`.
- Mostra lo stato di caricamento: nessuna vista dati si monta finché `workspaceId` è null.

### 4.2 Percorsi
Nuovo `src/lib/paths.ts`:
```ts
export const SHARED = [...] as const;   // elenco §2
export const PERSONAL = [...] as const; // elenco §2
export function colRef(ctx: { uid: string; wid: string }, col: string): CollectionReference
export function docRef(ctx: { uid: string; wid: string }, col: string, id: string): DocumentReference
```
Instrada su `workspaces/{wid}` se `col ∈ SHARED`, altrimenti su `users/{uid}`; lancia un errore
per collezioni non elencate. **Tutti** i `doc(db, 'users', userId, ...)` in `src/` passano da qui:
`firestoreService.ts`, `useFirestoreSync.ts`, `uploadPdf.ts`, `uploadBiDocument.ts`,
`uploadPhoto.ts`, `storicoFirestore.ts`, `auditLog.ts`. Criterio: dopo il refactor
`grep -rn "'users'" src` restituisce solo `paths.ts`.

### 4.3 useFirestoreSync
- Firma: `useFirestoreSync({ uid, wid })`; listener e scritture tramite `colRef/docRef`.
- `settings` resta personale (`users/{uid}/settings/app`).
- **Scritture per campo, non per documento intero.** Oggi un cambio scrive tutto l'oggetto con
  `merge: true`: con due utenti sullo stesso cliente, l'ultimo sovrascrive i campi dell'altro.
  Calcolare il diff superficiale (`prev[id]` vs `curr[id]`, chiavi di primo livello) e scrivere
  solo i campi cambiati, più `updatedBy` e `updatedAt`. Sui nuovi documenti aggiungere `createdBy`.
- Al cambio di workspace: annullare i listener, svuotare le collezioni condivise nello store
  (non i settings), poi ri-sottoscrivere. Il nome della chiave di persistenza locale diventa
  `next-move-storage:{wid}` così due workspace non si mescolano nel browser.
- Audit log: aggiungere `uid` dell'autore a ogni evento.

### 4.4 Impostazioni → "Spazio aziendale"
Sezione minima in `SettingsView`:
- nome workspace (modificabile da owner/admin);
- elenco membri: nome, email, ruolo, stato;
- invita: email + ruolo → crea `invites/{emailLower}` con `wid`; mostra gli inviti in attesa
  (query `invites` dove `wid == workspaceId`) con "Annulla";
- owner/admin: cambia ruolo, disattiva membro (`status: 'disabled'`, mai cancellare).
Usare i componenti Syrio esistenti (pannelli, campi, dialoghi). Nessun invio email in questo
blocco: l'invitato accede con quell'email e l'adesione è automatica (§4.1).

## 5. Migrazione dati (implementata lato client)

Decisione in fase di implementazione: niente script admin con service account. Al primo
accesso dopo il rilascio, `WorkspaceProvider` crea il workspace dell'utente e, se ci sono dati
in `users/{uid}`, li copia in `workspaces/{wid}` (stessi ID, `createdBy` impostato) mostrando
l'avanzamento a schermo. Solo dopo parte la sincronizzazione, così il primo snapshot non svuota
lo store locale.
- La sorgente `users/{uid}` **non viene cancellata**: resta come backup.
- Batch limitati a 400 operazioni / 8 MB (i chunk PDF pesano fino a 500 KB).
- Idempotente: se interrotta, riparte al login successivo (`legacyMigratedAt` sul workspace).
- `audit_logs` storici restano in `users/{uid}` come archivio.
- Consigliato comunque un export Firestore prima del deploy.

## 6. Criteri di accettazione

1. `npm run build` verde.
2. Test regole con l'emulatore (`@firebase/rules-unit-testing`, nuovo `tests/rules.test.ts`):
   - membro A legge/scrive `contacts` del suo workspace;
   - utente esterno C non legge né scrive nulla del workspace;
   - membro `disabled` non legge;
   - `sales` non può creare inviti né cambiare ruoli; `admin` sì;
   - invitato con email verificata entra con il ruolo dell'invito e non con uno superiore;
   - nessuno può modificare o cancellare `audit_logs`;
   - `users/{A}/settings` non è leggibile da B.
3. Due account reali sul progetto dev: A invita B, B accede e vede i clienti di A; una modifica di
   B compare ad A entro pochi secondi; A e B modificano campi diversi dello stesso cliente nello
   stesso momento → entrambi i campi sopravvivono.
4. `grep -rn "'users'" src` → solo `src/lib/paths.ts`.
5. `claudeApiKey` assente da qualsiasi documento sotto `workspaces/`.
6. Migrazione: dopo il primo accesso, conteggi uguali tra `users/{uid}` e `workspaces/{wid}`.
7. `scripts/syrio-browser-check.mjs` aggiornato per il nuovo contesto e ancora verde.

## 7. Rischi noti
- **Costi/letture:** ogni membro carica tutte le collezioni condivise. Va bene fino a qualche
  migliaio di documenti per collezione; oltre servirà la paginazione (non ora).
- **`next-move-mobile/`** continua a leggere `users/{uid}`: dopo la migrazione vedrà dati non più
  aggiornati. Da allineare in un blocco separato.
- **Conflitti sullo stesso campo:** con le scritture per campo restano possibili solo se due
  persone modificano lo stesso campo insieme; vince l'ultima. Accettato per v1.

## 8. Modalità di lavoro
Branch `feat/workspace`. Non toccare le modifiche non committate esistenti (`.serena/`,
`next-move-mobile/`, `previews/`, `.claude/settings.json`). Nessun deploy e nessuna esecuzione
dello script sul progetto reale senza conferma di Matt. Consegna: diff, esito build, esito test
regole, output del `--dry-run`.
