import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StoreState } from './types';

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      theme: 'light',
      profile: null,
      contacts: {},
      products: {},
      offers: {},
      deals: {},
      activities: {},
      targets: {},

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : (updates as any)
      })),
      setProfile: (profile) => set({ profile }),
      resetAll: () => set({
        profile: null,
        contacts: {},
        products: {},
        offers: {},
        deals: {},
        activities: {},
        targets: {}
      }),

      addContact: (contact) => set((state) => ({ 
        contacts: { ...state.contacts, [contact.id]: contact } 
      })),
      updateContact: (id, updates) => set((state) => ({
        contacts: { ...state.contacts, [id]: { ...state.contacts[id], ...updates } }
      })),
      addContactsBatch: (newContacts) => set((state) => {
        const contactsMap = { ...state.contacts };
        newContacts.forEach(c => { contactsMap[c.id] = c; });
        return { contacts: contactsMap };
      }),

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
      }),
      addCustomProduct: (productName) => set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          customProducts: [...(state.profile.customProducts || []), productName]
        } : null
      })),

      addOffer: (offer) => set((state) => ({ 
        offers: { ...state.offers, [offer.id]: offer } 
      })),
      updateOffer: (id, updates) => set((state) => ({
        offers: { ...state.offers, [id]: { ...state.offers[id], ...updates } }
      })),
      removeOffer: (id) => set((state) => {
        const newOffers = { ...state.offers };
        delete newOffers[id];
        return { offers: newOffers };
      }),

      addDeal: (deal) => set((state) => ({ 
        deals: { ...state.deals, [deal.id]: deal } 
      })),
      updateDeal: (id, updates) => set((state) => ({
        deals: { ...state.deals, [id]: { ...state.deals[id], ...updates } }
      })),

      addActivity: (activity) => set((state) => ({ 
        activities: { ...state.activities, [activity
