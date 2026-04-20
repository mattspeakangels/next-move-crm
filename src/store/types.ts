import { Contact, Deal, Activity, MonthlyTarget, UserProfile } from '../types';

export interface StoreState {
  contacts: Record<string, Contact>;
  deals: Record<string, Deal>;
  activities: Record<string, Activity>;
  targets: Record<string, MonthlyTarget>;
  profile: UserProfile | null;
  theme: 'light' | 'dark';
  
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  addContactsBatch: (contacts: Contact[]) => void;
  
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  
  addActivity: (activity: Activity) => void;
  updateTarget: (id: string, updates: Partial<MonthlyTarget>) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  
  addCustomProduct: (product: string) => void;
  
  toggleTheme: () => void;
  importState: (newState: any) => void;
  resetAll: () => void;
}
