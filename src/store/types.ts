import { 
  Contact, 
  Offer, 
  Product, 
  Deal, 
  Activity, 
  Target, 
  AppProfile, 
  Theme 
} from '../types';

export interface StoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  profile: AppProfile | null;
  updateProfile: (profile: Partial<AppProfile>) => void;
  setProfile: (profile: any, ...args: any[]) => void; 
  resetAll: () => void;

  contacts: Record<string, Contact>;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  addContactsBatch: (contacts: Contact[]) => void;

  products: Record<string, Product>;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addCustomProduct: (productName: string) => void;

  offers: Record<string, Offer>;
  addOffer: (offer: Offer) => void;
  updateOffer: (id: string, offer: Partial<Offer>) => void;
  removeOffer: (id: string) => void;

  deals: Record<string, Deal>;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, deal: Partial<Deal>) => void;

  activities: Record<string, Activity>;
  addActivity: (activity: Activity) => void;

  targets: Record<string, Target>;
  updateTarget: (target: Target) => void;
}
