export type DealStage = 'lead' | 'qualificato' | 'proposta' | 'negoziazione' | 'chiuso-vinto' | 'chiuso-perso';
export type ActivityType = 'chiamata' | 'email' | 'visita' | 'nota';
export type LostReason = 'prezzo' | 'competitor' | 'progetto-annullato' | 'cliente-finale-negativo' | 'altro';
export type ContactStatus = 'potenziale' | 'cliente';
export type OfferStatus = 'bozza' | 'inviata' | 'accettata' | 'rifiutata';
export type Theme = 'light' | 'dark';

export type NavView = 'dashboard' | 'contacts' | 'deals' | 'offers' | 'agenda' | 'products' | 'settings';

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
  products: string[]; // Modificato in Array per i Tag
  competitors: string[]; // Modificato in Array per i Tag
  pricesAndPayments: string;
  logisticsAndService: string;
}

export interface Contact {
  id: string;
  company: string;
  customerType?: CustomerType;
  contactName: string; // Mantenuto per compatibilità legacy
  role: string; // Mantenuto per compatibilità legacy
  email: string;
  phone: string;
  website?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  province?: string;
  country?: string;
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

export interface Product {
  id: string;
  code: string;
  description: string;
  category: string;
  price: number;
  sizes?: string;
  discount: number;
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
