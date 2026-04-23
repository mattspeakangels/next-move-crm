
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Contact, Deal, Offer, Product, AppProfile } from '../types';

interface StoreState {
  contacts: Record<string, Contact>;
  deals: Record<string, Deal>;
  offers: Record<string, Offer>;
  products: Record<string, Product>;
  profile: AppProfile | null;
  theme: 'light' | 'dark';
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void; // Eccola qui!
  setProfile: (profile: AppProfile) => void;
  toggleTheme: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      contacts: {},
      deals: {},
      offers: {},
      products: {},
      profile: null,
      theme: 'light',
      addContact: (contact) => set((state) => ({
        contacts: { ...state.contacts, [contact.id]: contact }
      })),
      updateContact: (id, updates) => set((state) => ({
        contacts: {
          ...state.contacts,
          [id]: { ...state.contacts[id], ...updates, updatedAt: Date.now() }
        }
      })),
      deleteContact: (id) => set((state) => {
        const newContacts = { ...state.contacts };
        delete newContacts[id];
        return { contacts: newContacts };
      }),
      setProfile: (profile) => set({ profile }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'next-move-storage' }
  )
);
