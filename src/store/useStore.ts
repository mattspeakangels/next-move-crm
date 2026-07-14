import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact, Deal, Offer, Product, AppProfile, Activity, SalesTransaction, Asset, CheckIn, TodoItem, NavView } from '../types';
import { idbStorage } from '../lib/idbStorage';

interface StoreState {
  contacts: Record<string, Contact>;
  deals: Record<string, Deal>;
  offers: Record<string, Offer>;
  products: Record<string, Product>;
  activities: Record<string, Activity>;
  salesTransactions: Record<string, SalesTransaction>;
  assets: Record<string, Asset>;
  checkIns: Record<string, CheckIn>;
  profile: AppProfile | null;
  theme: 'light' | 'dark';
  targets: Record<string, any>;
  discountApprovalThreshold: number;
  todos: Record<string, TodoItem>;
  footerTabs: NavView[];
  claudeApiKey: string;

  // Sistema
  setProfile: (profile: AppProfile) => void;
  updateProfile: (updates: Partial<AppProfile>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  resetAll: () => void;
  setDiscountApprovalThreshold: (value: number) => void;
  setClaudeApiKey: (key: string) => void;

  // Aziende
  addContact: (contact: Contact) => void;
  addContactsBatch: (contacts: Contact[]) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  deleteContactsBatch: (ids: string[]) => void;
  deleteAllContacts: () => void;

  // Trattative, Offerte, Prodotti
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  removeDeal: (id: string) => void;
  addOffer: (offer: Offer) => void;
  updateOffer: (id: string, updates: Partial<Offer>) => void;
  removeOffer: (id: string) => void;
  addProduct: (product: Product) => void;
  bulkAddProducts: (products: Product[]) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  clearProducts: () => void;
  addCustomProduct: (name: string) => void;

  // Attività e Target
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  updateTarget: (target: any) => void;

  // Asset / Parco Installato
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  removeAsset: (id: string) => void;

  // Business Intelligence
  addSalesTransaction: (transaction: SalesTransaction) => void;
  deleteSalesTransaction: (id: string) => void;
  clearSalesTransactions: () => void;

  // Todo
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt'>) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;
  setFooterTabs: (tabs: NavView[]) => void;

  // Check-in Geolocalizzazione
  addCheckIn: (checkIn: CheckIn) => void;

  deleteCheckIn: (id: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      contacts: {},
      deals: {},
      offers: {},
      products: {},
      activities: {},
      salesTransactions: {},
      assets: {},
      checkIns: {},
      targets: {},
      profile: null,
      theme: 'light',
      discountApprovalThreshold: 20,
      todos: {},
      footerTabs: ['dashboard', 'deals', 'agenda', 'contacts'],
      claudeApiKey: '',

      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      resetAll: () => set({ contacts: {}, deals: {}, offers: {}, products: {}, activities: {}, targets: {}, assets: {} }),
      setDiscountApprovalThreshold: (value) => set({ discountApprovalThreshold: value }),
      setClaudeApiKey: (key) => set({ claudeApiKey: key }),

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
      deleteContactsBatch: (ids) => set((state) => {
        const newContacts = { ...state.contacts };
        ids.forEach(id => delete newContacts[id]);
        return { contacts: newContacts };
      }),
      deleteAllContacts: () => set({ contacts: {} }),

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
      bulkAddProducts: (newProds) => set((state) => {
        const added: Record<string, Product> = {};
        for (const p of newProds) added[p.id] = p;
        return { products: { ...state.products, ...added } };
      }),
      updateProduct: (id, updates) => set((state) => ({
        products: { ...state.products, [id]: { ...state.products[id], ...updates } }
      })),
      removeProduct: (id) => set((state) => {
        const newProducts = { ...state.products };
        delete newProducts[id];
        return { products: newProducts };
      }),
      clearProducts: () => set({ products: {} }),
      addCustomProduct: (name) => set((state) => ({
        profile: state.profile ? { ...state.profile, customProducts: [...(state.profile.customProducts || []), name] } : null
      })),

      addActivity: (activity) => set((state) => ({
        activities: { ...state.activities, [activity.id]: activity }
      })),
      updateActivity: (id, updates) => set((state) => ({
        activities: { ...state.activities, [id]: { ...state.activities[id], ...updates } }
      })),
      deleteActivity: (id) => set((state) => {
        const newActivities = { ...state.activities };
        delete newActivities[id];
        return { activities: newActivities };
      }),
      updateTarget: (target) => set((state) => ({
        targets: { ...state.targets, [target.id]: target }
      })),

      addTodo: (todo) => set((state) => {
        const id = crypto.randomUUID();
        return { todos: { ...state.todos, [id]: { ...todo, id, createdAt: Date.now() } } };
      }),
      updateTodo: (id, updates) => set((state) => ({
        todos: { ...state.todos, [id]: { ...state.todos[id], ...updates } }
      })),
      deleteTodo: (id) => set((state) => {
        const newTodos = { ...state.todos };
        delete newTodos[id];
        return { todos: newTodos };
      }),
      setFooterTabs: (tabs) => set({ footerTabs: tabs }),

      addAsset: (asset) => set((state) => ({ assets: { ...state.assets, [asset.id]: asset } })),
      updateAsset: (id, updates) => set((state) => ({
        assets: { ...state.assets, [id]: { ...state.assets[id], ...updates, updatedAt: Date.now() } }
      })),
      removeAsset: (id) => set((state) => {
        const newAssets = { ...state.assets };
        delete newAssets[id];
        return { assets: newAssets };
      }),

      addSalesTransaction: (transaction) => set((state) => ({
        salesTransactions: { ...state.salesTransactions, [transaction.id]: transaction }
      })),
      deleteSalesTransaction: (id) => set((state) => {
        const newTransactions = { ...state.salesTransactions };
        delete newTransactions[id];
        return { salesTransactions: newTransactions };
      }),
      clearSalesTransactions: () => set({ salesTransactions: {} }),

      addCheckIn: (checkIn) => set((state) => ({
        checkIns: { ...state.checkIns, [checkIn.id]: checkIn }
      })),
      
      deleteCheckIn: (id) => set((state) => {
        const newCheckIns = { ...state.checkIns };
        delete newCheckIns[id];
        return { checkIns: newCheckIns };
      }),
    }),
    {
      name: 'next-move-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        contacts: state.contacts,
        deals: state.deals,
        offers: state.offers,
        products: state.products,
        activities: state.activities,
        salesTransactions: state.salesTransactions,
        assets: state.assets,
        checkIns: state.checkIns,
        targets: state.targets,
        theme: state.theme,
        profile: state.profile,
        discountApprovalThreshold: state.discountApprovalThreshold,
        todos: state.todos,
        footerTabs: state.footerTabs,
        claudeApiKey: state.claudeApiKey,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to hydrate store from localStorage:', error);
        } else if (state) {
          console.log('Store hydrated from localStorage', {
            contactCount: Object.keys(state.contacts || {}).length,
            productCount: Object.keys(state.products || {}).length,
          });

          // Migrazione una tantum: i task rimasti su "in-corso" erano bloccati lì
          // dal vecchio bug del checkbox a 3 stati (vedi TodoView) e andavano segnati come fatti.
          const stuckTodos = Object.values(state.todos || {}).filter((t) => t.status === 'in-corso');
          if (stuckTodos.length > 0) {
            const fixedTodos = { ...state.todos };
            for (const t of stuckTodos) {
              fixedTodos[t.id] = { ...t, status: 'fatto', completedAt: t.completedAt ?? Date.now() };
            }
            state.todos = fixedTodos;
            console.log(`Migrazione todo: ${stuckTodos.length} task "in corso" segnati come "fatto"`);
          }
        }
      }
    }
  )
);
