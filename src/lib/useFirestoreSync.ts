import { useEffect, useRef } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, writeBatch, deleteField } from 'firebase/firestore';
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
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    async function loadFromFirestore() {
      isLoadingRef.current = true;
      // Snapshot pre-caricamento: serve solo per capire, alla fine, quali dati
      // locali sono cambiati NEL FRATTEMPO (mentre le fetch qui sotto erano in
      // volo) cosi' da non perderli nel merge finale.
      const preLoadState = useStore.getState();
      const firestoreByCol: Record<string, Record<string, any>> = {};

      for (const col of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, 'users', userId, col));
        const firestoreData: Record<string, any> = {};
        snapshot.forEach((d) => { firestoreData[d.id] = d.data(); });
        firestoreByCol[col] = firestoreData;

        const localData = (preLoadState as any)[col] || {};
        if (Object.keys(localData).length > 0 || Object.keys(firestoreData).length > 0) {
          console.log(`Firestore sync ${col}:`, {
            local: Object.keys(localData).length,
            firestore: Object.keys(firestoreData).length,
          });
        }
      }

      const settingsUpdates: Record<string, any> = {};
      const settingsRef = doc(db, 'users', userId, 'settings', 'app');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const remote = settingsSnap.data();
        for (const field of SETTINGS_FIELDS) {
          if (remote[field] !== undefined) settingsUpdates[field] = remote[field];
        }
      } else {
        const localSettings: Record<string, any> = {};
        for (const field of SETTINGS_FIELDS) localSettings[field] = (preLoadState as any)[field];
        await setDoc(settingsRef, localSettings, { merge: true });
      }

      // Il caricamento sopra e' asincrono (una getDocs per collezione, in
      // sequenza): se l'utente aggiunge/modifica/cancella qualcosa mentre e'
      // in corso, quella modifica va confrontata con lo stato PIU' RECENTE
      // (non quello pre-caricamento), altrimenti il merge con Firestore la
      // sovrascrive e il dato inserito sparisce silenziosamente.
      const liveState = useStore.getState();
      const updates: Record<string, any> = { ...settingsUpdates };
      const pendingLocalChanges: { col: string; changes: { id: string; data: any }[]; deletes: string[] }[] = [];

      for (const col of COLLECTIONS) {
        const preLoad = (preLoadState as any)[col] || {};
        const live = (liveState as any)[col] || {};
        const firestoreData = firestoreByCol[col];
        const merged: Record<string, any> = { ...live };

        for (const [id, data] of Object.entries(firestoreData)) {
          // Se il dato locale non e' cambiato durante il caricamento, vince Firestore.
          // Se e' cambiato (aggiunto/modificato dall'utente nel frattempo), vince il locale.
          if (live[id] === preLoad[id]) merged[id] = data;
        }
        updates[col] = merged;

        const changes: { id: string; data: any }[] = [];
        const deletes: string[] = [];
        for (const [id, data] of Object.entries(live)) {
          if (data !== preLoad[id]) changes.push({ id, data });
        }
        for (const id of Object.keys(preLoad)) {
          if (!live[id]) deletes.push(id);
        }
        if (changes.length > 0 || deletes.length > 0) pendingLocalChanges.push({ col, changes, deletes });
      }

      useStore.setState(updates);
      isLoadingRef.current = false;

      // Le modifiche fatte durante il caricamento non sono state scritte su
      // Firestore (il subscribe qui sotto le ignora finche' isLoadingRef e'
      // true): le flushiamo ora esplicitamente.
      for (const { col, changes, deletes } of pendingLocalChanges) {
        flushWrites(userId, col, changes, deletes)
          .catch(err => console.error(`Firestore batch write failed [${col}]:`, err));
      }
    }

    loadFromFirestore();

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (isLoadingRef.current) return;

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
        const settingsRef = doc(db, 'users', userId, 'settings', 'app');
        setDoc(settingsRef, sanitizeForFirestore(changedSettings), { merge: true })
          .catch(err => console.error('Firestore settings write failed:', err));
      }
    });

    return unsubscribe;
  }, [userId]);
}
