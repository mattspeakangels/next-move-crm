
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Contact, Deal, Offer, Product, AppProfile } from '../types';

// Definizione per le attività (richiesta da AgendaView e CoachCard)
export interface Activity {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'task';
  title: string;
  contactId?: string;
  date: number;
  completed: boolean;
  notes?: string;
}

interface StoreState {
  contacts: Record<string, Contact>;
  deals: Record<string, Deal>;
  offers: Record<string, Offer>;
  products: Record<string, Product>;
  activities: Activity[]; // Aggiunto per CoachCard e Agenda
  profile: AppProfile | null;
  theme: 'light' | 'dark';
  
  // Azioni Profilo e Sistema
  setProfile: (profile: AppProfile) => void;
  updateProfile: (updates: Partial<AppProfile>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  resetAll: () => void;

  // Azioni Aziende
  addContact: (contact: Contact) => void;
  addContactsBatch: (contacts: Contact[]) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  // Azioni Trattative (Deals)
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  removeDeal: (id: string) => void;

  // Azioni Offerte
  addOffer: (offer: Offer) => void;
  updateOffer: (id: string, updates: Partial<Offer>) => void;
  removeOffer: (id: string) => void;

  // Azioni Prodotti
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      contacts: {},
      deals: {},
      offers: {},
      products: {},
      activities: [],
      profile: null,
      theme: 'light',

      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      resetAll: () => set({ contacts: {}, deals: {}, offers: {}, products: {}, activities: [] }),

      addContact: (contact) => set((state) => ({
        contacts: { ...state.contacts, [contact.id]: contact }
      })),
      addContactsBatch: (newContacts) => set((state) => {
        const updated = { ...state.contacts };
        newContacts.forEach(c => updated[c.id] = c);
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
        deals: { ...state.deals, [id]: { ...state.deals[id], ...updates, updatedAt: Date.now() } }
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
      removeProduct: (id) => set((state) => {
        const newProducts = { ...state.products };
        delete newProducts[id];
        return { products: newProducts };
      }),
    }),
    { name: 'next-move-storage' }
  )
);
