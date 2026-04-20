import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StoreState } from './types';

const initialState = {
  contacts: {},
  deals: {},
  activities: {},
  targets: {},
  profile: null,
  theme: 'light' as const,
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...initialState,
      
      addContact: (contact) => set((state) => ({ 
        contacts: { ...state.contacts, [contact.id]: contact } 
      })),
      
      updateContact: (id, updates) => set((state) => ({
        contacts: { ...state.contacts, [id]: { ...state.contacts[id], ...updates } }
      })),
      
      addContactsBatch: (newContacts) => set((state) => {
        const updated = { ...state.contacts };
        newContacts.forEach(c => { updated[c.id] = c; });
        return { contacts: updated };
      }),

      addDeal: (deal) => set((state) => ({ 
        deals: { ...state.deals, [deal.id]: deal } 
      })),

      updateDeal: (id, updates) => set((state) => {
        const oldDeal = state.deals[id];
        if (!oldDeal) return state;

        const newDeals = { ...state.deals, [id]: { ...oldDeal, ...updates } };
        let newTargets = { ...state.targets };

        if (updates.stage !== undefined && updates.stage !== oldDeal.stage) {
          const now = new Date();
          const targetId = `${now.getFullYear()}-${now.getMonth()}`;
          let currentTarget = newTargets[targetId] || {
            id: targetId,
            month: now.getMonth(),
            year: now.getFullYear(),
            targetValue: state.profile?.defaultMonthlyTarget || 0,
            closedValue: 0
          };

          let newClosedValue = currentTarget.closedValue;
          const dealValue = updates.value !== undefined ? updates.value : oldDeal.value;

          if (updates.stage === 'chiuso-vinto') {
            newClosedValue += dealValue;
          } else if (oldDeal.stage === 'chiuso-vinto') {
            newClosedValue -= dealValue;
          }

          newTargets[targetId] = { ...currentTarget, closedValue: newClosedValue };
        }

        return { deals: newDeals, targets: newTargets };
      }),

      deleteDeal: (id) => set((state) => {
        const newDeals = { ...state.deals };
        delete newDeals[id];
        return { deals: newDeals };
      }),

      addActivity: (activity) => set((state) => ({
        activities: { ...state.activities, [activity.id]: activity }
      })),

      updateTarget: (id, updates) => set((state) => ({
        targets: { ...state.targets, [id]: { ...state.targets[id], ...updates } }
      })),

      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : updates as any
      })),

      addCustomProduct: (product) => set((state) => {
        if (!state.profile || state.profile.customProducts.includes(product)) return state;
        return {
          profile: {
            ...state.profile,
            customProducts: [...state.profile.customProducts, product]
          }
        };
      }),

      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        if (newTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return { theme: newTheme };
      }),

      importState: (newState) => set((state) => ({
        ...state,
        ...newState,
      })),

      resetAll: () => set(() => ({ ...initialState }))
    }),
    {
      name: 'next-move-crm-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
