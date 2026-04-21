export type DealStage = 'lead' | 'qualificato' | 'proposta' | 'negoziazione' | 'chiuso-vinto' | 'chiuso-perso';
export type ActivityType = 'chiamata' | 'email' | 'visita' | 'nota';
export type ContactStatus = 'potenziale' | 'cliente';
export type OfferStatus = 'bozza' | 'inviata' | 'accettata' | 'rifiutata';
export type Theme = 'light' | 'dark';

// Qui diciamo all'app che esistono tutte queste sezioni
export type NavView = 'dashboard' | 'contacts' | 'deals' | 'offers' | 'agenda' | 'products' | 'settings';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  description?: string;
}

export interface Contact {
  id: string;
  company: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  status: ContactStatus;
  sector: string;
  region: string;
  createdAt: number;
  updatedAt: number;
}

export interface OfferItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  price: number;
  discount: number;
}

export interface Offer {
  id: string;
  contactId: string;
  offerNumber: string;
  date: number; // Data di invio
  items: OfferItem[];
  status: OfferStatus;
  totalAmount: number;
  followUpDate: number;
}

export interface AppProfile {
  name: string;
  role: string;
  company: string;
  defaultMonthlyTarget: number;
  customProducts: string[];
}
