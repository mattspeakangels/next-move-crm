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
  // Impostazioni
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  profile: AppProfile | null;
  updateProfile: (profile: Partial<AppProfile>) => void;
  setProfile: (profile: AppProfile, ...args: any[]) => void; // Supporta argomenti extra per evitare l'errore TS2554
  resetAll: () => void;

  // Aziende
  contacts: Record<string, Contact>;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  addContactsBatch: (contacts: Contact[]) => void;

  // Catalogo Prodotti
  products: Record<string, Product>;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addCustomProduct: (productName: string) => void;

  // Offerte (Preventivi)
  offers: Record<string, Offer>;
  addOffer: (offer: Offer) => void;
  updateOffer: (id: string, offer: Partial<Offer>) => void;

  // Pipeline (Trattative)
  deals: Record<string, Deal>;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, deal: Partial<Deal>) => void;

  // Attività (Agenda/Log)
  activities: Record<string, Activity>;
  addActivity: (activity: Activity) => void;

  // Obiettivi
  targets: Record<string, Target>;
  updateTarget: (target: Target) => void;
}
