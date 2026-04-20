import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact, Deal, Activity, Target, AppProfile } from '../types';

export interface StoreState {
  contacts: Record<string, Contact>;
  deals: Record<string, Deal>;
  activities: Record<string, Activity>;
  targets: Record<string, Target>;
  profile: AppProfile | null;
  theme: 'light' | 'dark';
  
  setProfile: (profile: AppProfile) => void;
  updateProfile: (updates: Partial<AppProfile>) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  addContactsBatch: (contacts: Contact[]) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  addActivity: (activity: Activity) => void;
  updateTarget: (id: string, target: Target) => void;
  toggleTheme: () => void;
  addCustomProduct: (product: string) => void;
  importState: (newState: Partial<StoreState>) => void;
  resetAll: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      contacts: {},
      deals: {},
      activities: {},
      targets: {},
      profile: null,
      theme: 'light',

      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),
      addContact: (contact) => set((state) => ({
        contacts: { ...state.contacts, [contact.id]: contact }
      })),
      updateContact: (id, updates) => set((state) => ({
        contacts: { ...state.contacts, [id]: { ...state.contacts[id], ...updates } }
      })),
      addContactsBatch: (newContacts) => set((state) => {
        const updatedContacts = { ...state.contacts };
        newContacts.forEach(c => { updatedContacts[c.id] = c; });
        return { contacts: updatedContacts };
      }),
      addDeal: (deal) => set((state) => ({
        deals: { ...state.deals, [deal.id]: deal }
      })),
      updateDeal: (id, updates) => set((state) => ({
        deals: { ...state.deals, [id]: { ...state.deals[id], ...updates } }
      })),
      deleteDeal: (id) => set((state) => {
        const newDeals = { ...state.deals };
        delete newDeals[id];
        return { deals: newDeals };
      }),
      addActivity: (activity) => set((state) => ({
        activities: { ...state.activities, [activity.id]: activity }
      })),
      updateTarget: (id, target) => set((state) => ({
        targets: { ...state.targets, [id]: target }
      })),
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
      addCustomProduct: (product) => set((state) => ({
        profile: state.profile ? { ...state.profile, customProducts: [...state.profile.customProducts, product] } : null
      })),
      importState: (newState) => set((state) => ({ ...state, ...newState })),
      resetAll: () => {
        localStorage.clear();
        set({ contacts: {}, deals: {}, activities: {}, targets: {}, profile: null, theme: 'light' });
      },
    }),
    {
      name: 'next-move-crm-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
