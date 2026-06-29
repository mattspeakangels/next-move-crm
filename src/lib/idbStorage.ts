const DB_NAME = 'next-move-db';
const STORE  = 'zustand';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const db = await openDB();
    const idbVal: string | undefined = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });

    // Migrazione automatica da localStorage (una tantum)
    if (idbVal == null) {
      const lsVal = localStorage.getItem(name);
      if (lsVal) {
        await idbStorage.setItem(name, lsVal);
        localStorage.removeItem(name);
        return lsVal;
      }
    }
    return idbVal ?? null;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, name);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },

  removeItem: async (name: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(name);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },
};
