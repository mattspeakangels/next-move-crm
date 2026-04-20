import { Contact, Deal, Activity, Target, AppProfile } from '../types';

export interface StoreState {
  contacts: Record<string, Contact>;
  deals: Record<string, Deal>;
  activities: Record<string, Activity>;
  targets: Record<string, Target>;
  profile: AppProfile | null;
  theme: 'light' | 'dark';
  setProfile: (profile: AppProfile) => void;
  updateProfile: (updates: Partial<AppProfile>) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  addContactsBatch: (contacts: Contact[]) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  addActivity: (activity: Activity) => void;
  updateTarget: (id: string, target: Target) => void;
  toggleTheme: () => void;
  addCustomProduct: (product: string) => void;
  importState: (newState: Partial<StoreState>) => void;
  resetAll: () => void;
}
