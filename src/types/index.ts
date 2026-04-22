export type DealStage = 'lead' | 'qualificato' | 'proposta' | 'negoziazione' | 'chiuso-vinto' | 'chiuso-perso';
export type ActivityType = 'chiamata' | 'email' | 'visita' | 'nota';
export type LostReason = 'prezzo' | 'competitor' | 'progetto-annullato' | 'cliente-finale-negativo' | 'altro';
export type ContactStatus = 'potenziale' | 'cliente';
export type OfferStatus = 'bozza' | 'inviata' | 'accettata' | 'rifiutata';
export type Theme = 'light' | 'dark';

export type NavView = 'dashboard' | 'contacts' | 'deals' | 'offers' | 'agenda' | 'products' | 'settings';

export interface CompanyIntelligence {
  products: string;
  competitors: string;
  prices: string;
  paymentTerms: str110 packages are looking for funding
  run `npm fund` for details
> next-move-crm@1.0.0 build
> tsc && vite build
src/components/deals/ActivityFormModal.tsx(25,7): error TS2353: Object literal may only specify known properties, and 'dealId' does not exist in type 'Activity'.
src/store/types.ts(1,35): error TS2305: Module '"../types"' has no exported member 'Target'.
src/store/useStore.ts(3,56): error TS2305: Module '"../types"' has no exported member 'Target'.
src/utils/coachLogic.ts(27,53): error TS2339: Property 'dealId' does not exist on type 'Activity'.
src/views/AgendaView.tsx(35,7): error TS2353: Object literal may only specify known properties, and 'createdAt' does not exist in type 'Activity'.
src/views/OffersView.tsx(35,30): error TS2339: Property 'name' does not exist on type 'Product'.
src/views/OffersView.tsx(159,62): error TS2339: Property 'name' does not exist on type 'Product'.
src/views/ProductsView.tsx(3,36): error TS6133: 'Tag' is declared but its value is never read.
src/views/ProductsView.tsx(8,33): error TS2339: Property 'removeProduct' does not exist on type 'StoreState'.
Error: Command "npm run build" exited with 2

