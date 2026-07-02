import { useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, writeBatch, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';
import { logAuditEvent } from './auditLog';

const COLLECTIONS = ['contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions', 'checkIns', 'todos', 'targets'] as const;

// Campi singoli (non mappe id->doc) sincronizzati come un unico documento impostazioni,
// cosi' profilo/tema/soglie/tab restano coerenti su tutti i device.
const SETTINGS_FIELDS = ['profile', 'theme', 'discountApprovalThreshold', 'footerTabs', 'claudeApiKey'] as const;

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

async function flushWrites(
  userId: string,
  col: string,
  changes: { id: string; data: any }[],
  deletes: string[],
) {
  const allOps = [
    ...changes.map(c => ({ type: 'set' as const, id: c.id, data: c.data })),
    ...deletes.map(id => ({ type: 'del' as const, id, data: null })),
  ];

  for (let i = 0; i < allOps.length; i += BATCH_SIZE) {
    const chunk = allOps.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = doc(db, 'users', userId, col, op.id);
      if (op.type === 'set') batch.set(ref, sanitizeForFirestore(op.data), { merge: true });
      else batch.delete(ref);
    }
    await batch.commit();
  }
}

export function useFirestoreSync(userId: string) {
  // true mentre applichiamo allo store dati appena arrivati da Firestore: il
  // subscribe piu' sotto lo controlla per non "rispedire" al cloud dati che
  // arrivano dal cloud stesso (eco inutile, non un'azione dell'utente).
  const isApplyingRemoteRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

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
        collection(db, 'users', userId, col),
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
          for (const id of Object.keys(lastRemote)) {
            if (!(id in remoteData) && id in merged && localState[id] === lastRemote[id]) {
              delete merged[id];
              changed = true;
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

    const settingsRef = doc(db, 'users', userId, 'settings', 'app');
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

        const changes: { id: string; data: any; isNew: boolean }[] = [];
        const deletes: string[] = [];

        for (const [id, data] of Object.entries(curr)) {
          if (curr[id] !== prev[id]) {
            changes.push({ id, data, isNew: !prev[id] });
          }
        }
        for (const id of Object.keys(prev)) {
          if (!curr[id]) deletes.push(id);
        }

        if (changes.length === 0 && deletes.length === 0) continue;

        // Batch su Firestore (chunked per rispettare il limite 500)
        flushWrites(userId, col, changes.map(c => ({ id: c.id, data: c.data })), deletes)
          .catch(err => console.error(`Firestore batch write failed [${col}]:`, err));

        // Audit log solo per modifiche singole (non per import massivi)
        if (changes.length <= 5) {
          for (const { id, data, isNew } of changes) {
            if (isNew) logAuditEvent(userId, col, id, 'CREATE', {}, data);
            else logAuditEvent(userId, col, id, 'UPDATE', prev[id], data);
          }
        }
        for (const id of deletes) {
          logAuditEvent(userId, col, id, 'DELETE', prev[id], {});
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
  }, [userId]);
}
