import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact, Deal, Offer, Product, AppProfile, Activity, SalesTransaction, Asset, CheckIn, TodoItem, NavView, Lead, ProspectActivity, Sequence, LeadSequence, LeadEmailDraft } from '../types';
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
  leads: Record<string, Lead>;
  prospectActivities: Record<string, ProspectActivity>;
  sequences: Record<string, Sequence>;
  leadSequences: Record<string, LeadSequence>;
  leadEmailDrafts: Record<string, LeadEmailDraft>;

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
  addActivitiesBatch: (activities: Activity[]) => void;
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

  // Prospecting
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addProspectActivity: (activity: ProspectActivity) => void;
  updateProspectActivity: (id: string, updates: Partial<ProspectActivity>) => void;
  deleteProspectActivity: (id: string) => void;
  addSequence: (sequence: Sequence) => void;
  seedSequencesIfEmpty: (sequences: Sequence[]) => void;
  addLeadSequence: (leadSequence: LeadSequence) => void;
  updateLeadSequence: (id: string, updates: Partial<LeadSequence>) => void;
  addLeadEmailDraft: (draft: LeadEmailDraft) => void;
  addLeadEmailDraftsBatch: (drafts: LeadEmailDraft[]) => void;
  updateLeadEmailDraft: (id: string, updates: Partial<LeadEmailDraft>) => void;
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
      leads: {},
      prospectActivities: {},
      sequences: {},
      leadSequences: {},
      leadEmailDrafts: {},

      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      resetAll: () => set({ contacts: {}, deals: {}, offers: {}, products: {}, activities: {}, targets: {}, assets: {}, leads: {}, prospectActivities: {}, leadSequences: {}, leadEmailDrafts: {} }),
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
      addActivitiesBatch: (batch) => set((state) => {
        const updated = { ...state.activities };
        batch.forEach(a => updated[a.id] = a);
        return { activities: updated };
      }),
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
        const createdAt = Date.now();
        return { todos: { ...state.todos, [id]: { ...todo, id, createdAt, statusHistory: [{ status: todo.status, at: createdAt }] } } };
      }),
      updateTodo: (id, updates) => set((state) => {
        const current = state.todos[id];
        const statusChanged = updates.status && updates.status !== current.status;
        return {
          todos: {
            ...state.todos,
            [id]: {
              ...current,
              ...updates,
              statusHistory: statusChanged
                ? [...(current.statusHistory || []), { status: updates.status!, at: Date.now() }]
                : current.statusHistory,
            },
          },
        };
      }),
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

      addLead: (lead) => set((state) => ({
        leads: { ...state.leads, [lead.id]: lead }
      })),
      updateLead: (id, updates) => set((state) => ({
        leads: { ...state.leads, [id]: { ...state.leads[id], ...updates, updatedAt: Date.now() } }
      })),
      deleteLead: (id) => set((state) => {
        const newLeads = { ...state.leads };
        delete newLeads[id];
        return { leads: newLeads };
      }),

      addProspectActivity: (activity) => set((state) => ({
        prospectActivities: { ...state.prospectActivities, [activity.id]: activity }
      })),
      updateProspectActivity: (id, updates) => set((state) => ({
        prospectActivities: { ...state.prospectActivities, [id]: { ...state.prospectActivities[id], ...updates } }
      })),
      deleteProspectActivity: (id) => set((state) => {
        const newActivities = { ...state.prospectActivities };
        delete newActivities[id];
        return { prospectActivities: newActivities };
      }),

      addSequence: (sequence) => set((state) => ({
        sequences: { ...state.sequences, [sequence.id]: sequence }
      })),
      seedSequencesIfEmpty: (sequences) => set((state) => {
        if (Object.keys(state.sequences).length > 0) return {};
        const seeded: Record<string, Sequence> = {};
        for (const s of sequences) seeded[s.id] = s;
        return { sequences: seeded };
      }),

      addLeadSequence: (leadSequence) => set((state) => ({
        leadSequences: { ...state.leadSequences, [leadSequence.id]: leadSequence }
      })),
      updateLeadSequence: (id, updates) => set((state) => ({
        leadSequences: { ...state.leadSequences, [id]: { ...state.leadSequences[id], ...updates } }
      })),

      addLeadEmailDraft: (draft) => set((state) => ({
        leadEmailDrafts: { ...state.leadEmailDrafts, [draft.id]: draft }
      })),
      addLeadEmailDraftsBatch: (drafts) => set((state) => {
        const updated = { ...state.leadEmailDrafts };
        for (const d of drafts) updated[d.id] = d;
        return { leadEmailDrafts: updated };
      }),
      updateLeadEmailDraft: (id, updates) => set((state) => ({
        leadEmailDrafts: { ...state.leadEmailDrafts, [id]: { ...state.leadEmailDrafts[id], ...updates } }
      })),
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
        leads: state.leads,
        prospectActivities: state.prospectActivities,
        sequences: state.sequences,
        leadSequences: state.leadSequences,
        leadEmailDrafts: state.leadEmailDrafts,
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
          const stuckTodos = Object.values(state.todos || {}).filter((t) => (t.status as string) === 'in-corso');
          if (stuckTodos.length > 0) {
            const fixedTodos = { ...state.todos };
            for (const t of stuckTodos) {
              const at = t.completedAt ?? Date.now();
              fixedTodos[t.id] = {
                ...t,
                status: 'fatto',
                completedAt: at,
                statusHistory: [...(t.statusHistory || []), { status: 'fatto', at }],
              };
            }
            state.todos = fixedTodos;
            console.log(`Migrazione todo: ${stuckTodos.length} task "in corso" segnati come "fatto"`);
          }
        }
      }
    }
  )
);
