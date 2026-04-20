export type DealStage = 'lead' | 'qualificato' | 'proposta' | 'negoziazione' | 'chiuso-vinto' | 'chiuso-perso';
export type ActivityType = 'chiamata' | 'email' | 'visita' | 'nota';
export type LostReason = 'prezzo' | 'competitor' | 'progetto-annullato' | 'cliente-finale-negativo' | 'altro';

export interface Contact {
  id: string;
  company: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  region: string;
  sector: string;
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
  // Nuovi campi per Offerte e Analisi
  offerRef?: string;       // Numero offerta / preventivo
  lostReason?: LostReason; // Perché è stata persa
  competitor?: string;     // Chi l'ha presa?
  lostDetails?: string;    // Note extra sulla perdita
}

export interface Activity {
  id: string;
  dealId: string;
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
