export type DealStage = 'lead' | 'qualificato' | 'proposta' | 'negoziazione' | 'chiuso-vinto' | 'chiuso-perso';
export type NextActionType = 'chiama' | 'email' | 'invia-offerta' | 'fissa-visita' | 'altro';
export type NextActionPriority = 'alta' | 'media' | 'bassa';
export type ActivityType = 'chiamata' | 'email' | 'visita' | 'nota' | 'demo' | 'call-remota' | 'sopralluogo' | 'formazione';
export type ActivityOutcome = 'riuscita' | 'parziale' | 'nessun-contatto' | 'promessa-callback' | 'rifiuto' | 'nota';
export type LostReason = 'prezzo' | 'competitor' | 'progetto-annullato' | 'cliente-finale-negativo' | 'altro';
export type ContactStatus = 'potenziale' | 'cliente';
export type OfferStatus = 'bozza' | 'inviata' | 'accettata' | 'rifiutata';
export type Theme = 'light' | 'dark';

// AGGIUNTO 'map' ALLA NAVIGAZIONE
export type NavView = 'dashboard' | 'contacts' | 'deals' | 'offers' | 'agenda' | 'products' | 'settings' | 'map' | 'attivita' | 'analytics' | 'storico' | 'assets';

export type CustomerType = 'dealer' | 'end-user';
export type StakeholderRole = 'Titolare' | 'Responsabile Acquisti' | 'Responsabile Tecnico' | 'Altro';

export interface Stakeholder {
  id: string;
  name: string;
  role: StakeholderRole;
  email: string;
  phone: string;
}

export interface CompanyIntelligence {
  products: string[];
  competitors: string[];
  pricesAndPayments: string;
  logisticsAndService: string;
}

export interface Contact {
  id: string;
  company: string;
  customerType?: CustomerType;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  website?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  province?: string;
  country?: string;
  
  // NUOVI CAMPI PER LA MAPPA
  lat?: number;
  lng?: number;
  
  status: ContactStatus;
  classification?: string;
  sector: string;
  region: string;
  notes?: string;
  intelligence?: CompanyIntelligence; 
  stakeholders?: Stakeholder[];
  createdAt: number;
  updatedAt: number;
}

export interface OfferItem {
  id: string;
  productId?: string;
  description: string;
  sizes?: string; 
  quantity: number;
  price: number;
  discount: number;
}

export interface Offer {
  id: string;
  contactId: string;
  offerNumber: string;
  date: number; 
  items: OfferItem[];
  status: OfferStatus;
  totalAmount: number;
  followUpDate: number;
  deliveryTime?: string; 
  shippingCost?: number; 
}

export type ProductCategory = 'giacche' | 'felpe' | 'pantaloni' | 'hivis' | 'tshirt' | 'accessori';
export type ProductLine = 'X1900' | 'X1500' | 'X1600' | 'X1800' | 'X1700' | 'X1100' | 'HiVis' | 'Softshell' | 'Knitwear';

export interface Product {
  id: string;
  code: string;
  description: string;   // backward compat
  name?: string;         // display name (fallback → description)
  category: string;
  price: number;
  sizes?: string;
  discount: number;
  colors?: string[];     // es. ['nero', 'blu', 'grigio']
  stock?: number;        // 0 = esaurito, undefined = non gestito
  line?: ProductLine;    // linea di prodotto Blåkläder
}

export interface Deal {
  id: string;
  contactId: string;
  value: number;
  probability: number;
  products: string[];
  stage: DealStage;
  nextAction: string;
  nextActionDeadline: number;
  nextActionType?: NextActionType;
  nextActionPriority?: NextActionPriority;
  notes: string;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  offerRef?: string;
  lostReason?: LostReason;
  competitor?: string;
}

export interface Activity {
  id: string;
  contactId: string;
  dealId?: string;
  type: ActivityType;
  date: number;
  outcome: string;
  notes: string;
  outcomeType?: ActivityOutcome;
  results?: string;
  createdAt?: number;
}

export interface Target {
  id: string;
  month: number;
  year: number;
  targetValue: number;
  closedValue: number;
}

export interface AppProfile {
  name: string;
  role: string;
  company: string;
  defaultMonthlyTarget: number;
  customProducts: string[];
}

export interface SalesTransaction {
  id: string;
  date: number;              // timestamp of sale
  contactId: string;         // customer (match to Contact)
  productName: string;       // product description
  quantity: number;          // units sold
  unitPrice: number;         // price per unit (€)
  totalAmount: number;       // quantity × unitPrice
  stage: DealStage;         // 'chiuso-vinto', 'chiuso-perso', etc
  notes?: string;
  createdAt: number;        // when imported
}

export type AssetStatus = 'attivo' | 'scaduto' | 'da-sostituire' | 'dismesso';

export interface Asset {
  id: string;
  contactId: string;
  productId?: string;
  description: string;
  serialNumber?: string;
  installDate: number;
  expiryDate?: number;
  status: AssetStatus;
  notes?: string;
  purchaseAmount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface BISalesPeriod {
  label: string;           // "Apr 2024"
  month: string;           // "2024-04" for sorting
  revenue: number;
  avgDealValue: number;
}

export interface BITopItem {
  name: string;           // customer/product name
  value: number;          // revenue or quantity
  count: number;          // transaction count
  percentage: string;     // "15.3" (string, calculated in selector)
}
