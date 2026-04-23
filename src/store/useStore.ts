import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Contact, Deal, Offer, Product, AppProfile, Activity } from '../types';

interface StoreState {
  contacts: Record<string, Contact>;
  deals: Record<string, Deal>;
  offers: Record<string, Offer>;
  products: Record<string, Product>;
  activities: Record<string, Activity>;
  profile: AppProfile | null;
  theme: 'light' | 'dark';
  targets: Record<string, any>;

  // Sistema
  setProfile: (profile: AppProfile) => void;
  updateProfile: (updates: Partial<AppProfile>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  resetAll: () => void;

  // Aziende
  addContact: (contact: Contact) => void;
  addContactsBatch: (contacts: Contact[]) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  // Trattative, Offerte, Prodotti
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  removeDeal: (id: string) => void;
  addOffer: (offer: Offer) => void;
  updateOffer: (id: string, updates: Partial<Offer>) => void;
  removeOffer: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addCustomProduct: (name: string) => void;

  // Attività e Target
  addActivity: (activity: Activity) => void;
  updateTarget: (target: any) => void; // Corretto per accettare un solo argomento
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      contacts: {},
      deals: {},
      offers: {},
      products: {},
      activities: {},
      targets: {},
      profile: null,
      theme: 'light',

      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      resetAll: () => set({ contacts: {}, deals: {}, offers: {}, products: {}, activities: {}, targets: {} }),

      addContact: (contact) => set((state) => ({
        contacts: { ...state.contacts, [contact.id]: contact }
      })),
      addContactsBatch: (batch) => set((state) => {
        const updated = { ...state.contacts };
        batch.forEach(c => updated[c.id] = c);
        return { contacts: updated };
      }),
      updateContact: (id, updates) => set((state) => ({
        contacts: { ...state.contacts, [id]: { ...state.contacts[id], ...updates, updatedAt: Date.now() } }
      })),
      deleteContact: (id) => set((state) => {
        const newContacts = { ...state.contacts };
        delete newContacts[id];
        return { contacts: newContacts };
      }),

      addDeal: (deal) => set((state) => ({ deals: { ...state.deals, [deal.id]: deal } })),
      updateDeal: (id, updates) => set((state) => ({
        deals: { ...state.deals, [id]: { ...state.deals[id], ...updates } }
      })),
      removeDeal: (id) => set((state) => {
        const newDeals = { ...state.deals };
        delete newDeals[id];
        return { deals: newDeals };
      }),

      addOffer: (offer) => set((state) => ({ offers: { ...state.offers, [offer.id]: offer } })),
      updateOffer: (id, updates) => set((state) => ({
        offers: { ...state.offers, [id]: { ...state.offers[id], ...updates } }
      })),
      removeOffer: (id) => set((state) => {
        const newOffers = { ...state.offers };
        delete newOffers[id];
        return { offers: newOffers };
      }),

      addProduct: (product) => set((state) => ({ products: { ...state.products, [product.id]: product } })),
      updateProduct: (id, updates) => set((state) => ({
        products: { ...state.products, [id]: { ...state.products[id], ...updates } }
      })),
      removeProduct: (id) => set((state) => {
        const newProducts = { ...state.products };
        delete newProducts[id];
        return { products: newProducts };
      }),
      addCustomProduct: (name) => set((state) => ({
        profile: state.profile ? { ...state.profile, customProducts: [...(state.profile.customProducts || []), name] } : null
      })),

      addActivity: (activity) => set((state) => ({
        activities: { ...state.activities, [activity.id]: activity }
      })),
      updateTarget: (target) => set((state) => ({
        targets: { ...state.targets, [target.id]: target } // Corretto per l'argomento singolo
      })),
    }),
    { name: 'next-move-storage' }
  )
);
