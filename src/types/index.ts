export type DealStage = 'lead' | 'qualificato' | 'proposta' | 'negoziazione' | 'chiuso-vinto' | 'chiuso-perso';
export type NextActionType = 'chiama' | 'email' | 'invia-offerta' | 'fissa-visita' | 'altro';
export type NextActionPriority = 'alta' | 'media' | 'bassa';
export type ActivityType = 'chiamata' | 'email' | 'visita' | 'nota' | 'demo' | 'call-remota' | 'sopralluogo' | 'formazione' | 'smart-working' | 'ufficio';
export type ActivityOutcome = 'riuscita' | 'parziale' | 'nessun-contatto' | 'promessa-callback' | 'rifiuto' | 'nota';
export type LostReason = 'prezzo' | 'competitor' | 'progetto-annullato' | 'cliente-finale-negativo' | 'altro';
export type ContactStatus = 'potenziale' | 'cliente';
export type OfferStatus = 'bozza' | 'inviata' | 'accettata' | 'rifiutata';
export type Theme = 'light' | 'dark';

export type NavView = 'dashboard' | 'contacts' | 'deals' | 'offers' | 'agenda' | 'products' | 'settings' | 'map' | 'map-full' | 'attivita' | 'analytics' | 'storico' | 'legal' | 'assets' | 'todo';

export type TodoTipo = 'offerta' | 'scheda-tecnica' | 'email-info' | 'chiamata-follow' | 'campionatura' | 'demo' | 'visita' | 'altro';
export type TodoPriorita = 'alta' | 'media' | 'bassa';
export type TodoStatus = 'da-fare' | 'in-corso' | 'fatto';

export interface TodoItem {
  id: string;
  contactId?: string;
  dealId?: string;
  titolo: string;
  note?: string;
  tipo: TodoTipo;
  scadenza?: string;
  priorita: TodoPriorita;
  status: TodoStatus;
  createdAt: number;
  completedAt?: number;
  source: 'manuale' | 'visita' | 'ai';
  sourceActivityId?: string;
}

export type CustomerType = 'dealer' | 'end-user';
export type ContactSegment = 'dealer' | 'industria' | 'edilizia' | 'end-user';
export type StakeholderRole = 'Titolare' | 'Responsabile Acquisti' | 'Responsabile Tecnico' | 'Altro';

export interface Stakeholder {
  id: string;
  /** Legacy single-name field — kept for backward compat */
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  email: string;
  phone: string;
}

export interface CompanyIntelligence {
  products: string[];
  competitors: string[];
  pricesAndPayments: string;
  logisticsAndService: string;
}

export interface ContactLocation {
  id: string;
  label?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  province?: string;
  country?: string;
  lat?: number;
  lng?: number;
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

  // Sedi aggiuntive (secondi negozi, altri indirizzi operativi)
  locations?: ContactLocation[];

  status: ContactStatus;
  segment?: ContactSegment;
  classification?: string;
  sector: string;
  region: string;
  notes?: string;
  intelligence?: CompanyIntelligence;
  stakeholders?: Stakeholder[];
  profiling?: ProfilingData;
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

export type OfferContactMode = 'dealer' | 'end-user' | 'dealer+end-user';

export interface Offer {
  id: string;
  contactId: string;
  /** Modalità cliente: chi acquista direttamente (dealer o end user) o entrambi se la vendita passa dal rivenditore al cliente finale. Assente = legacy, trattata come 'end-user'. */
  contactMode?: OfferContactMode;
  /** Cliente finale, valorizzato solo quando contactMode === 'dealer+end-user' (contactId resta il dealer) */
  endUserContactId?: string;
  offerNumber: string;
  date: number;
  items: OfferItem[];
  status: OfferStatus;
  totalAmount: number;
  followUpDate: number;
  deliveryTime?: string;
  shippingCost?: number;
  pdfUrl?: string;
  pdfName?: string;
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
  imageUrl?: string;     // base64 jpeg o URL remoto
  productUrl?: string;   // link pagina prodotto blaklader.it
  listPrice?: number;    // prezzo di listino lordo (IVA inclusa)
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
  closingDate?: number;
  closedAt?: number;
  offerRef?: string;
  lostReason?: LostReason;
  competitor?: string;
  nomeStorico?: string;
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
  transcript?: string;
}

export interface Obiezione {
  testo: string;
  categoria: 'prezzo' | 'fornitore-attuale' | 'qualita' | 'timing' | 'brand' | 'logistica' | 'altro';
  risposta: string;
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

export type AuditOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  timestamp: number;
  collection: string;           // contacts, deals, offers, etc
  documentId: string;           // the document that was changed
  operation: AuditOperation;    // CREATE, UPDATE, DELETE
  changes?: Record<string, any>; // fields that changed (for UPDATE)
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface CheckIn {
  id: string;
  contactId: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  notes?: string;
  createdAt: number;
}

// ─── PROFILAZIONE BLAKLADER ───────────────────────────────────────────────────

export type BlakladerBrand =
  | 'Diadora' | 'U-Power' | 'Snickers' | 'E.Strauss' | 'Cofra' | 'Kapriol'
  | 'Sparco' | 'Mascot' | 'Fristads' | 'Portwest' | 'Clique' | 'Helly Hansen'
  | 'Altro';

export type QualificationScore = 1 | 2 | 3 | 4 | 5;
export type QualificationBadge = 'HOT' | 'WARM' | 'COLD' | 'TRASH';

export interface QualificationCriteria {
  esigenzaReale: QualificationScore;
  decisionMaker: QualificationScore;
  aperturaFornitore: QualificationScore;
  timeline: QualificationScore;
  budget: QualificationScore;
}

export interface CompetitorNote {
  brand: string;
  tone: string;
}

export interface DealerProfiling {
  type: 'dealer';
  dataVisita: string; // ISO date
  // Sezione 2
  segmento: 'A1' | 'A2' | 'A3' | 'A4' | '';
  numDipendenti: string;
  fatturatoEst: string;
  canaleVendita: string[];
  modelloOrdini: string[];
  clienteFinale: string[];
  percWorkwear: string;
  // Sezione 3
  brandAttuali: BlakladerBrand[];
  brandAltro: string;
  brandDominante: string;
  dpiCatIII: 'no' | 'soloScarpe' | 'siParziale' | 'siCompleto' | '';
  dpiParziale: string;
  reclamiResi: 'no' | 'si' | '';
  reclamiMotivo: string;
  processoRiordino: string[];
  // Sezione 4
  painPoints: string[];
  painAltro: string;
  painPrioritario: string;
  fraseEsatta: string;
  // Sezione 5
  prodottiInteresse: string[];
  prodottiAltro: string;
  campionaturaLasciata: string;
  // Sezione 6
  qualificazione: QualificationCriteria;
  noteQualificazione: string;
  // Sezione 7
  competitor: CompetitorNote[];
  // Sezione 8
  nextStepAzioni: string[];
  nextStepData: string;
  nextStepNote: string;
  // AI
  obiezioni?: Obiezione[];
}

export interface EndUserProfiling {
  type: 'end-user';
  dataVisita: string;
  rsppNome: string;
  respAcquisti: string;
  // Sezione 2
  segmentoEdilizia: 'B1' | 'B2' | 'B3' | 'B4' | '';
  segmentoIndustria: 'C1' | 'C2' | 'C3' | 'C4' | '';
  numDipendentiTotali: string;
  numDipendentiDPI: string;
  fatturatoStimato: string;
  certificazioni: string[];
  obiettiviESG: string;
  // Sezione 3
  livelloDPI: 'catI' | 'catII' | 'catIII' | 'nonSanno' | '';
  rischiSpecifici: string[];
  dvrAggiornato: 'si' | 'no' | 'nonSa' | '';
  ispezioniRecenti: 'no' | 'si' | '';
  ispezioniEsito: string;
  schedeEN: 'siCompleto' | 'soloRziale' | 'no' | 'nonSa' | '';
  // Sezione 4
  fornitoreAttuale: string;
  canaleAcquisto: string[];
  frequenzaRinnovo: string;
  durataMediaCapo: string;
  spesaDipAnno: string;
  lamenteleLavoratori: string;
  chiGestisceLogistica: string[];
  // Sezione 5
  painPoints: string[];
  painAltro: string;
  painPrioritario: string;
  fraseEsatta: string;
  // Sezione 6 - TCO note
  tcoCostoCapo: string;
  tcoDurataMesi: string;
  tcoNumDipendenti: string;
  tcoCostoFlotta: string;
  tcoNote: string;
  // Sezione 7
  prodottiInteresse: string[];
  prodottiAltro: string;
  campionaturaLasciata: string;
  // Sezione 8
  qualificazione: QualificationCriteria;
  noteQualificazione: string;
  // Sezione 9
  nextStepAzioni: string[];
  nextStepData: string;
  nextStepNote: string;
  // AI
  obiezioni?: Obiezione[];
}

export type ProfilingData = DealerProfiling | EndUserProfiling;
