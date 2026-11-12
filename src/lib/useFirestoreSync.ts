import { useEffect, useRef } from 'react';
import { onSnapshot, setDoc, writeBatch, deleteField, type DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import { colRef, docRef, isShared, type DataCollection, type DataContext } from './paths';
import { useStore, type StoreState } from '../store/useStore';
import { logAuditEvent } from './auditLog';
import { changedFields, sanitizeForFirestore as sanitize, type DocFields } from './syncDiff';

// Pulizia dei campi prima della scrittura: undefined di primo livello → deleteField()
const sanitizeForFirestore = (data: DocFields) => sanitize(data, deleteField);

const COLLECTIONS = ['customerCommunications', 'customerRequests', 'contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions', 'checkIns', 'todos', 'targets', 'sequences', 'prospectingTracks', 'prospectEmailDrafts', 'prospectHistory', 'groups', 'strategicFocuses'] as const satisfies readonly (DataCollection & keyof StoreState)[];
type SyncedCollection = typeof COLLECTIONS[number];

/** Una collezione dello store vista come mappa id → campi del documento. */
type DocMap = Record<string, DocFields>;

// Le collezioni sincronizzate sono mappe id → documento tipizzato (Contact, Deal, …):
// qui servono come documenti generici, per confrontarli campo per campo.
function readCollection(state: StoreState, col: SyncedCollection): DocMap {
  return (state[col] ?? {}) as unknown as DocMap;
}
function collectionPatch(col: SyncedCollection, docs: DocMap): Partial<StoreState> {
  return { [col]: docs } as Partial<StoreState>;
}

// Campi singoli (non mappe id->doc) sincronizzati come un unico documento impostazioni,
// cosi' profilo/tema/soglie/tab restano coerenti su tutti i device.
const SETTINGS_FIELDS = ['profile', 'theme', 'discountApprovalThreshold', 'footerTabs', 'sidebarOrder'] as const satisfies readonly (keyof StoreState)[];

function readSettings(state: StoreState): DocFields {
  const out: DocFields = {};
  for (const field of SETTINGS_FIELDS) out[field] = state[field];
  return out;
}

// Campo di una versione precedente: la chiave Gemini stava nelle impostazioni dell'utente.
// Ora è solo sul server, quindi se è rimasta nel documento remoto va cancellata.
const LEGACY_API_KEY_FIELD = 'claudeApiKey';

// Firestore WriteBatch ha un limite di 500 operazioni per batch
const BATCH_SIZE = 400;

type WriteOp =
  | { type: 'create'; id: string; data: DocFields }
  | { type: 'update'; id: string; fields: DocFields; full: DocFields }
  | { type: 'del'; id: string };

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
    } catch (err: unknown) {
      // update() fallisce se il documento remoto non esiste (es. creato offline o
      // cancellato da un collega): riscriviamo i singoli documenti per intero, così
      // un solo caso limite non fa perdere l'intero batch.
      if ((err as { code?: string } | null)?.code !== 'not-found') throw err;
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
      let lastRemote: DocMap = readCollection(useStore.getState(), col);

      const unsub = onSnapshot(
        colRef(col, dataCtx),
        snapshot => {
          // Eco della nostra stessa scrittura ottimistica (fase cache-locale
          // prima della conferma server): lo stato locale la riflette gia'.
          if (snapshot.metadata.hasPendingWrites) return;

          const remoteData: DocMap = {};
          snapshot.forEach(d => { remoteData[d.id] = d.data(); });

          const localState = readCollection(useStore.getState(), col);
          const merged: DocMap = { ...localState };
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
            useStore.setState(collectionPatch(col, merged));
            isApplyingRemoteRef.current = false;
          }
        },
        err => console.error(`Firestore listen failed [${col}]:`, err),
      );
      unsubscribers.push(unsub);
    }

    const settingsRef = docRef('settings', 'app', dataCtx);
    let lastRemoteSettings: DocFields = readSettings(useStore.getState());
    let settingsSeen = false;

    const unsubSettings = onSnapshot(
      settingsRef,
      snap => {
        if (snap.metadata.hasPendingWrites) return;

        if (!snap.exists()) {
          if (!settingsSeen) {
            settingsSeen = true;
            setDoc(settingsRef, sanitizeForFirestore(readSettings(useStore.getState())), { merge: true })
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
        const localSettings = readSettings(useStore.getState());
        const updates: DocFields = {};
        let changed = false;
        for (const field of SETTINGS_FIELDS) {
          if (remote[field] === undefined) continue;
          if (localSettings[field] === lastRemoteSettings[field]) {
            if (localSettings[field] !== remote[field]) changed = true;
            updates[field] = remote[field];
          }
        }
        lastRemoteSettings = { ...lastRemoteSettings, ...remote };

        if (changed) {
          isApplyingRemoteRef.current = true;
          // Solo i campi impostazioni elencati sopra, arrivati dal documento remoto
          useStore.setState(updates as Partial<StoreState>);
          isApplyingRemoteRef.current = false;
        }
      },
      err => console.error('Firestore settings listen failed:', err),
    );
    unsubscribers.push(unsubSettings);

    const unsubscribeStore = useStore.subscribe((state, prevState) => {
      if (isApplyingRemoteRef.current) return;

      for (const col of COLLECTIONS) {
        if (state[col] === prevState[col]) continue;
        const curr = readCollection(state, col);
        const prev = readCollection(prevState, col);

        const ops: WriteOp[] = [];
        const shared = isShared(col);
        const audit: { id: string; isNew: boolean; prev?: DocFields; data: DocFields }[] = [];

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

      const changedSettings: DocFields = {};
      for (const field of SETTINGS_FIELDS) {
        if (state[field] !== prevState[field]) changedSettings[field] = state[field];
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
