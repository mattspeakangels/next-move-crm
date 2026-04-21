export type DealStage = 'lead' | 'qualificato' | 'proposta' | 'negoziazione' | 'chiuso-vinto' | 'chiuso-perso';
export type ActivityType = 'chiamata' | 'email' | 'visita' | 'nota';
export type ContactStatus = 'potenziale' | 'cliente';
export type OfferStatus = 'bozza' | 'inviata' | 'accettata' | 'rifiutata';

export interface Product {
  id: string;
  code: string;       // Codice articolo
  name: string;       // Nome prodotto
  category: string;   // Linea di prodotto/Categoria
  price: number;      // Prezzo di listino
  description?: string;
}

export interface CompanyIntelligence {
  products: string;
  competitors: string;
  prices: string;
  paymentTerms: string;
  service: string;
  delivery: string;
}

export interface Contact {
  id: string;
  company: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  status: ContactStatus;
  province?: string;
  intelligence?: CompanyIntelligence; 
  createdAt: number;
}

export interface OfferItem {
  id: string;
  productId?: string; // Se collegato a catalogo
  description: string;
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
  followUpDate: number; // La data del richiamo tra 7gg
}

export interface Activity {
  id: string;
  contactId: string;
  type: ActivityType;
  date: number;
  notes: string;
}

export interface AppProfile {
  name: string;
  company: string;
}
