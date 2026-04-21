export type DealStage = 'lead' | 'qualificato' | 'proposta' | 'negoziazione' | 'chiuso-vinto' | 'chiuso-perso';
export type ActivityType = 'chiamata' | 'email' | 'visita' | 'nota';
export type LostReason = 'prezzo' | 'competitor' | 'progetto-annullato' | 'cliente-finale-negativo' | 'altro';
export type ContactStatus = 'potenziale' | 'cliente';

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
  createdAt: number;
  updatedAt: number;
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
  contactId: string; // <-- ORA È LEGATO ALL'AZIENDA
  dealId?: string;   // <-- Resta opzionale per il futuro
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
