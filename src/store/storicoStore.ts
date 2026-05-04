import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ProdottoRecord {
  itemId: string;
  nome: string;
  fatturato2023: number;
  fatturato2024: number;
  fatturato2025?: number;
  fatturato2026?: number;
}

export interface ClienteRecord {
  clientId: number;
  nome: string;
  fatturato2023: number;
  margine2023: number;
  fatturato2024: number;
  margine2024: number;
  fatturato2025?: number;
  margine2025?: number;
  fatturato2026?: number;
  margine2026?: number;
  prodotti: ProdottoRecord[];
}

export interface StoricoBudget {
  annuale: number;
  mensile: Record<string, number>;
}

export interface OrderRecord {
  date: string;
  year: number;
  amount: number;
  margin: number;
  quantity: number;
}

export interface ProdottoDettagliato {
  itemId: string;
  nome: string;
  ordini: OrderRecord[];
}

export interface ClienteDettagliato {
  clientId: number;
  nome: string;
  prodotti: ProdottoDettagliato[];
  fatturato2023: number;
  fatturato2024: number;
  fatturato2025: number;
  fatturato2026: number;
  margine2023: number;
  margine2024: number;
  margine2025: number;
  margine2026: number;
}

// ─── STORE ────────────────────────────────────────────────────────────────────

interface StoricoState {
  clienti: ClienteRecord[];
  clientiDettagliati: ClienteDettagliato[];
  fileName: string;
  anni: string[];
  budget: StoricoBudget;

  setClienti: (clienti: ClienteRecord[]) => void;
  setClientiDettagliati: (clienti: ClienteDettagliato[]) => void;
  setFileName: (name: string) => void;
  setAnni: (anni: string[]) => void;
  setBudget: (budget: StoricoBudget | ((prev: StoricoBudget) => StoricoBudget)) => void;
  reset: () => void;
}

// Store con persist — i dati parsati sopravvivono sia alla navigazione che al refresh.
// Vengono salvati in localStorage (chiave 'storico-storage').
// Il file originale NON viene salvato, solo i dati già elaborati (< 1MB tipicamente).
export const useStoricoStore = create<StoricoState>()(
  persist(
    (set) => ({
      clienti: [],
      clientiDettagliati: [],
      fileName: '',
      anni: [],
      budget: { annuale: 0, mensile: {} },

      setClienti: (clienti) => set({ clienti }),
      setClientiDettagliati: (clientiDettagliati) => set({ clientiDettagliati }),
      setFileName: (fileName) => set({ fileName }),
      setAnni: (anni) => set({ anni }),
      setBudget: (budget) =>
        set((state) => ({
          budget: typeof budget === 'function' ? budget(state.budget) : budget,
        })),
      reset: () =>
        set({ clienti: [], clientiDettagliati: [], fileName: '', anni: [], budget: { annuale: 0, mensile: {} } }),
    }),
    {
      name: 'storico-storage',
    }
  )
);
