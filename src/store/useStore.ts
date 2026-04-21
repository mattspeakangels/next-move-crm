import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Contact, Activity, Deal, Product, AppProfile } from '../types';

interface StoreState {
  profile: AppProfile | null;
  contacts: Record<string, Contact>;
  activities: Record<string, Activity>;
  deals: Record<string, Deal>;
  products: Record<string, Product>;
  setProfile: (profile: AppProfile) => void;
  updateProfile: (profile: Partial<AppProfile>) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  addContactsBatch: (contacts: Contact[]) => void;
  addActivity: (activity: Activity) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, deal: Partial<Deal>) => void;
  addProduct: (product: Product) => void;
  addProductsBatch: (products: Product[]) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      profile: null,
      contacts: {},
      activities: {},
      deals: {},
      products: {},
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),
      addContact: (contact) => set((state) => ({
        contacts: { ...state.contacts, [contact.id]: contact }
      })),
      updateContact: (id, contact) => set((state) => ({
        contacts: {
          ...state.contacts,
          [id]: { ...state.contacts[id], ...contact }
        }
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
        deals: {
          ...state.deals,
          [id]: { ...state.deals[id], ...deal }
        }
      })),
      addProduct: (product) => set((state) => ({
        products: { ...state.products, [product.id]: product }
      })),
      addProductsBatch: (newProducts) => set((state) => {
        const updatedProducts = { ...state.products };
        newProducts.forEach(p => { updatedProducts[p.id] = p; });
        return { products: updatedProducts };
      }),
    }),
    { name: 'next-move-storage' }
  )
);
