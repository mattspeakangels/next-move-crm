import { useEffect, useRef } from 'react';
import { onSnapshot, setDoc, writeBatch, deleteField, type DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import { colRef, docRef, isShared, type DataCollection, type DataContext } from './paths';
import { useStore } from '../store/useStore';
import { logAuditEvent } from './auditLog';

const COLLECTIONS: readonly DataCollection[] = ['customerCommunications', 'customerRequests', 'contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions', 'checkIns', 'todos', 'targets', 'sequences', 'prospectingTracks', 'prospectEmailDrafts', 'prospectHistory', 'groups', 'strategicFocuses'];

// Campi singoli (non mappe id->doc) sincronizzati come un unico documento impostazioni,
// cosi' profilo/tema/soglie/tab restano coerenti su tutti i device.
const SETTINGS_FIELDS = ['profile', 'theme', 'discountApprovalThreshold', 'footerTabs', 'sidebarOrder'] as const;

// Campo di una versione precedente: la chiave Gemini stava nelle impostazioni dell'utente.
// Ora è solo sul server, quindi se è rimasta nel documento remoto va cancellata.
const LEGACY_API_KEY_FIELD = 'claudeApiKey';

// Firestore WriteBatch ha un limite di 500 operazioni per batch
const BATCH_SIZE = 400;

// Firestore rifiuta i valori `undefined` (es. TodoItem con completedAt/scadenza
// non impostati): un solo campo undefined faceva fallire l'intero batch della
// collezione, silenziosamente. Nei campi top-level undefined diventa
// deleteField() (con merge:true rimuove il campo remoto); nei nested viene tolto.
function stripUndefinedDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.filter(v => v !== undefined).map(stripUndefinedDeep);
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return value;
}

function sanitizeForFirestore(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v === undefined ? deleteField() : stripUndefinedDeep(v);
  }
  return out;
}

type WriteOp =
  | { type: 'create'; id: string; data: Record<string, any> }
  | { type: 'update'; id: string; fields: Record<string, any>; full: Record<string, any> }
  | { type: 'del'; id: string };

/**
 * Diff superficiale tra due versioni di un documento: solo i campi di primo livello
 * cambiati. Scrivere i soli campi modificati evita che due colleghi che lavorano
 * sullo stesso cliente si cancellino a vicenda le modifiche.
 */
function changedFields(prev: Record<string, any>, curr: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(curr)) if (curr[k] !== prev[k]) out[k] = curr[k];
  for (const k of Object.keys(prev)) if (!(k in curr)) out[k] = undefined;
  return out;
}

async function commitOps(ctx: DataContext, col: DataCollection, ops: WriteOp[]) {
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const chunk = ops.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = docRef(col, op.id, ctx);
      if (op.type === 'create') batch.set(ref, sanitizeForFirestore(op.data), { merge: true });
      else if (op.type === 'update') batch.update(ref, sanitizeForFirestore(op.fields));
      else batch.delete(ref);
    }
    try {
      await batch.commit();
    } catch (err: any) {
      // update() fallisce se il documento remoto non esiste (es. creato offline o
      // cancellato da un collega): riscriviamo i singoli documenti per intero, così
      // un solo caso limite non fa perdere l'intero batch.
      if (err?.code !== 'not-found') throw err;
      for (const op of chunk) {
        const ref: DocumentReference = docRef(col, op.id, ctx);
        if (op.type === 'update') await setDoc(ref, sanitizeForFirestore(op.full), { merge: true });
        else if (op.type === 'create') await setDoc(ref, sanitizeForFirestore(op.data), { merge: true });
      }
    }
  }
}

export function useFirestoreSync(ctx: DataContext | null) {
  const uid = ctx?.uid ?? '';
  const wid = ctx?.wid ?? '';
  // true mentre applichiamo allo store dati appena arrivati da Firestore: il
  // subscribe piu' sotto lo controlla per non "rispedire" al cloud dati che
  // arrivano dal cloud stesso (eco inutile, non un'azione dell'utente).
  const isApplyingRemoteRef = useRef(false);

  useEffect(() => {
    if (!uid || !wid) return;
    const dataCtx: DataContext = { uid, wid };

    const unsubscribers: Array<() => void> = [];

    // Sync in tempo reale (onSnapshot, non piu' una getDocs una tantum): senza
    // questo, un To Do/contatto/deal aggiunto su un device non compariva su un
    // altro device gia' aperto finche' non lo si riavviava. Ora ogni modifica
    // scritta da un device viene ricevuta dagli altri device connessi entro
    // pochi secondi.
    for (const col of COLLECTIONS) {
      // "Ultima versione remota conosciuta" per id: serve a distinguere, quando
      // arriva un nuovo snapshot, se il dato locale e' rimasto invariato da
      // allora (vince il remoto) oppure e' stato modificato nel frattempo su
      // QUESTO device (vince il locale, verra' scritto dal subscribe sotto).
      let lastRemote: Record<string, any> = (useStore.getState() as any)[col] || {};

      const unsub = onSnapshot(
        colRef(col, dataCtx),
        snapshot => {
          // Eco della nostra stessa scrittura ottimistica (fase cache-locale
          // prima della conferma server): lo stato locale la riflette gia'.
          if (snapshot.metadata.hasPendingWrites) return;

          const remoteData: Record<string, any> = {};
          snapshot.forEach(d => { remoteData[d.id] = d.data(); });

          const localState = (useStore.getState() as any)[col] || {};
          const merged: Record<string, any> = { ...localState };
          let changed = false;

          for (const [id, data] of Object.entries(remoteData)) {
            if (localState[id] === lastRemote[id] && merged[id] !== data) {
              merged[id] = data;
              changed = true;
            }
          }
          // 'sequences' non ha mai una delete lato utente (nessuna deleteSequence in store):
          // e' seed statico scritto localmente al mount, prima che il primo snapshot
          // Firestore (ancora vuoto la primissima volta) arrivi. Applicare qui la stessa
          // logica di cancellazione delle altre collection cancellava il seed appena
          // scritto in locale, lasciando 'sequences' vuoto per tutta la sessione e
          // rompendo silenziosamente l'avvio delle sequenze di prospecting.
          if (col !== 'sequences') {
            for (const id of Object.keys(lastRemote)) {
              if (!(id in remoteData) && id in merged && localState[id] === lastRemote[id]) {
                delete merged[id];
                changed = true;
              }
            }
          }

          lastRemote = remoteData;

          if (changed) {
            isApplyingRemoteRef.current = true;
            useStore.setState({ [col]: merged } as any);
            isApplyingRemoteRef.current = false;
          }
        },
        err => console.error(`Firestore listen failed [${col}]:`, err),
      );
      unsubscribers.push(unsub);
    }

    const settingsRef = docRef('settings', 'app', dataCtx);
    let lastRemoteSettings: Record<string, any> = {};
    for (const field of SETTINGS_FIELDS) lastRemoteSettings[field] = (useStore.getState() as any)[field];
    let settingsSeen = false;

    const unsubSettings = onSnapshot(
      settingsRef,
      snap => {
        if (snap.metadata.hasPendingWrites) return;

        if (!snap.exists()) {
          if (!settingsSeen) {
            settingsSeen = true;
            const localSettings: Record<string, any> = {};
            for (const field of SETTINGS_FIELDS) localSettings[field] = (useStore.getState() as any)[field];
            setDoc(settingsRef, sanitizeForFirestore(localSettings), { merge: true })
              .catch(err => console.error('Firestore settings write failed:', err));
          }
          return;
        }
        settingsSeen = true;

        const remote = snap.data();
        if (remote[LEGACY_API_KEY_FIELD] !== undefined) {
          setDoc(settingsRef, { [LEGACY_API_KEY_FIELD]: deleteField() }, { merge: true })
            .catch(err => console.error('Rimozione della vecchia chiave AI non riuscita:', err));
        }
        const localState = useStore.getState();
        const updates: Record<string, any> = {};
        let changed = false;
        for (const field of SETTINGS_FIELDS) {
          if (remote[field] === undefined) continue;
          if ((localState as any)[field] === lastRemoteSettings[field]) {
            if ((localState as any)[field] !== remote[field]) changed = true;
            updates[field] = remote[field];
          }
        }
        lastRemoteSettings = { ...lastRemoteSettings, ...remote };

        if (changed) {
          isApplyingRemoteRef.current = true;
          useStore.setState(updates);
          isApplyingRemoteRef.current = false;
        }
      },
      err => console.error('Firestore settings listen failed:', err),
    );
    unsubscribers.push(unsubSettings);

    const unsubscribeStore = useStore.subscribe((state, prevState) => {
      if (isApplyingRemoteRef.current) return;

      for (const col of COLLECTIONS) {
        const curr = (state as any)[col] as Record<string, any>;
        const prev = (prevState as any)[col] as Record<string, any>;

        if (curr === prev) continue;

        const ops: WriteOp[] = [];
        const shared = isShared(col);
        const audit: { id: string; isNew: boolean; prev?: any; data?: any }[] = [];

        for (const [id, data] of Object.entries(curr)) {
          if (curr[id] === prev[id]) continue;
          const before = prev[id];
          if (!before) {
            const stamped = shared ? { ...data, createdBy: data?.createdBy ?? uid, updatedBy: uid } : data;
            ops.push({ type: 'create', id, data: stamped });
          } else {
            const fields = changedFields(before, data);
            if (Object.keys(fields).length === 0) continue;
            const stampedFields = shared ? { ...fields, updatedBy: uid } : fields;
            const full = shared ? { ...data, updatedBy: uid } : data;
            ops.push({ type: 'update', id, fields: stampedFields, full });
          }
          audit.push({ id, isNew: !before, prev: before, data });
        }
        for (const id of Object.keys(prev)) {
          if (!curr[id]) ops.push({ type: 'del', id });
        }

        if (ops.length === 0) continue;

        commitOps(dataCtx, col, ops)
          .catch(err => console.error(`Firestore batch write failed [${col}]:`, err));

        // Audit log solo per modifiche singole (non per import massivi)
        if (audit.length <= 5) {
          for (const a of audit) {
            if (a.isNew) logAuditEvent(uid, col, a.id, 'CREATE', {}, a.data);
            else logAuditEvent(uid, col, a.id, 'UPDATE', a.prev, a.data);
          }
        }
        for (const op of ops) {
          if (op.type === 'del') logAuditEvent(uid, col, op.id, 'DELETE', prev[op.id], {});
        }
      }

      const changedSettings: Record<string, any> = {};
      for (const field of SETTINGS_FIELDS) {
        const curr = (state as any)[field];
        const prev = (prevState as any)[field];
        if (curr !== prev) changedSettings[field] = curr;
      }
      if (Object.keys(changedSettings).length > 0) {
        setDoc(settingsRef, sanitizeForFirestore(changedSettings), { merge: true })
          .catch(err => console.error('Firestore settings write failed:', err));
      }
    });
    unsubscribers.push(unsubscribeStore);

    return () => {
      unsubscribers.forEach(u => u());
    };
  }, [uid, wid]);
}
