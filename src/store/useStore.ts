import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Contact, Activity, Deal, Product, AppProfile, Target, Theme } from '../types';

interface StoreState {
  profile: AppProfile | null;
  contacts: Record<string, Contact>;
  activities: Record<string, Activity>;
  deals: Record<string, Deal>;
  products: Record<string, Product>;
  targets: Record<string, Target>;
  theme: Theme;
  setProfile: (profile: AppProfile) => void;
  updateProfile: (updates: Partial<AppProfile>) => void;
  toggleTheme: () => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  addContactsBatch: (contacts: Contact[]) => void;
  addActivity: (activity: Activity) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, deal: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  updateTarget: (id: string, target: Partial<Target>) => void;
  addProduct: (product: Product) => void;
  addProductsBatch: (products: Product[]) => void;
  resetAll: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      profile: null,
      contacts: {},
      activities: {},
      deals: {},
      products: {},
      targets: {},
      theme: 'light',
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      addContact: (contact) => set((state) => ({
        contacts: { ...state.contacts, [contact.id]: contact }
      })),
      updateContact: (id, contact) => set((state) => ({
        contacts: { ...state.contacts, [id]: { ...state.contacts[id], ...contact } }
      })),
      addContactsBatch: (newContacts) => set((state) => {
        const updatedContacts = { ...state.contacts };
        newContacts.forEach(c => { updatedContacts[c.id] = c; });
        return { contacts: updatedContacts };
      }),
      addActivity: (activity) => set((state) => ({
        activities: { ...state.activities, [activity.id]: activity }
      })),
      addDeal: (deal) => set((state) => ({
        deals: { ...state.deals, [deal.id]: deal }
      })),
      updateDeal: (id, deal) => set((state) => ({
        deals: { ...state.deals, [id]: { ...state.deals[id], ...deal } }
      })),
      deleteDeal: (id) => set((state) => {
        const newDeals = { ...state.deals };
        delete newDeals[id];
        return { deals: newDeals };
      }),
      updateTarget: (id, target) => set((state) => ({
        targets: { ...state.targets, [id]: { ...state.targets[id], ...target } }
      })),
      addProduct: (product) => set((state) => ({
        products: { ...state.products, [product.id]: product }
      })),
      addProductsBatch: (newProducts) => set((state) => {
        const updatedProducts = { ...state.products };
        newProducts.forEach(p => { updatedProducts[p.id] = p; });
        return { products: updatedProducts };
      }),
      resetAll: () => set({ profile: null, contacts: {}, activities: {}, deals: {}, products: {}, targets: {} }),
    }),
    { name: 'next-move-storage' }
  )
);
