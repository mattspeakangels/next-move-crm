import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StoreState } from './types';

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Stato Iniziale
      theme: 'light',
      profile: null,
      contacts: {},
      products: {},
      offers: {},
      deals: {},
      activities: {},
      targets: {},

      // Azioni Impostazioni
      setTheme: (theme) => set({ theme }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : (updates as any)
      })),

      // Azioni Aziende
      addContact: (contact) => set((state) => ({ 
        contacts: { ...state.contacts, [contact.id]: contact } 
      })),
      updateContact: (id, updates) => set((state) => ({
        contacts: { ...state.contacts, [id]: { ...state.contacts[id], ...updates } }
      })),

      // Azioni Catalogo
      addProduct: (product) => set((state) => ({ 
        products: { ...state.products, [product.id]: product } 
      })),
      updateProduct: (id, updates) => set((state) => ({
        products: { ...state.products, [id]: { ...state.products[id], ...updates } }
      })),
      removeProduct: (id) => set((state) => {
        const newProducts = { ...state.products };
        delete newProducts[id];
        return { products: newProducts };
      }), // <--- La logica di eliminazione che mancava

      // Azioni Offerte
      addOffer: (offer) => set((state) => ({ 
        offers: { ...state.offers, [offer.id]: offer } 
      })),
      updateOffer: (id, updates) => set((state) => ({
        offers: { ...state.offers, [id]: { ...state.offers[id], ...updates } }
      })),

      // Azioni Pipeline
      addDeal: (deal) => set((state) => ({ 
        deals: { ...state.deals, [deal.id]: deal } 
      })),
      updateDeal: (id, updates) => set((state) => ({
        deals: { ...state.deals, [id]: { ...state.deals[id], ...updates } }
      })),

      // Azioni Attività
      addActivity: (activity) => set((state) => ({ 
        activities: { ...state.activities, [activity.id]: activity } 
      })),

      // Azioni Obiettivi
      updateTarget: (target) => set((state) => ({ 
        targets: { ...state.targets, [target.id]: target } 
      })),
    }),
    {
      name: 'next-move-crm-storage', // Nome per il LocalStorage
    }
  )
);
