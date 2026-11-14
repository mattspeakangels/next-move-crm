import type { Activity, Contact, Deal, Group, Offer, Product, SalesTransaction, StrategicFocus, TodoItem } from '../types';

// Azienda di esempio mostrata durante la visita guidata: nomi inventati, date
// calcolate rispetto a oggi così il calendario e le scadenze sono sempre attuali.

const DAY = 86_400_000;

function at(now: number, days: number, hour = 9, minute = 0): number {
  const d = new Date(now + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}
const isoDay = (now: number, days: number) => {
  const d = new Date(now + days * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface DemoData {
  contacts: Record<string, Contact>;
  deals: Record<string, Deal>;
  offers: Record<string, Offer>;
  products: Record<string, Product>;
  activities: Record<string, Activity>;
  todos: Record<string, TodoItem>;
  salesTransactions: Record<string, SalesTransaction>;
  groups: Record<string, Group>;
  strategicFocuses: Record<string, StrategicFocus>;
}

const byId = <T extends { id: string }>(list: T[]): Record<string, T> => Object.fromEntries(list.map(x => [x.id, x]));

export function buildDemoData(now = Date.now()): DemoData {
  const c = (id: string, fields: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'role' | 'email' | 'phone' | 'region'> & Partial<Contact>): Contact => ({
    id, role: 'Titolare', email: `info@${id.replace('demo-', '')}.example`, phone: '+39 02 0000000', region: 'Lombardia',
    country: 'Italia', createdAt: now - 200 * DAY, updatedAt: now - 2 * DAY, ...fields,
  });

  const contacts = [
    c('demo-edilrossi', { company: 'Edil Rossi Costruzioni', contactName: 'Marco Rossi', status: 'cliente', customerType: 'end-user', segment: 'edilizia', sector: 'Edilizia', city: 'Bergamo', province: 'BG', address: 'Via Borgo Palazzo 120', lat: 45.6983, lng: 9.6773, groupId: 'demo-gruppo-cantieri', priorityToVisit: true, notes: '45 operai in cantiere, rinnovo divise a inizio stagione.' }),
    c('demo-ferramentabianchi', { company: 'Ferramenta Bianchi', contactName: 'Laura Bianchi', status: 'cliente', customerType: 'dealer', segment: 'dealer', sector: 'Rivendita', city: 'Brescia', province: 'BS', address: 'Via Milano 45', lat: 45.5416, lng: 10.2118, role: 'Responsabile Acquisti', notes: 'Rivenditore storico, ordina ogni mese.' }),
    c('demo-metalmeccanica', { company: 'Metalmeccanica Lombarda', contactName: 'Giorgio Colombo', status: 'cliente', customerType: 'end-user', segment: 'industria', sector: 'Industria', city: 'Monza', province: 'MB', address: 'Viale Lombardia 12', lat: 45.5845, lng: 9.2744, role: 'Responsabile Sicurezza' }),
    c('demo-impiantiverdi', { company: 'Impianti Verdi', contactName: 'Sara Verdi', status: 'potenziale', customerType: 'end-user', segment: 'edilizia', sector: 'Impiantistica', city: 'Como', province: 'CO', lat: 45.8081, lng: 9.0852, groupId: 'demo-gruppo-cantieri', notes: 'Incontrata in fiera, interessata all’alta visibilità.' }),
    c('demo-autoservice', { company: 'Autoservice Ferrari', contactName: 'Paolo Ferrari', status: 'cliente', customerType: 'end-user', segment: 'industria', sector: 'Officine', city: 'Milano', province: 'MI', address: 'Via Mecenate 76', lat: 45.4642, lng: 9.19 }),
    c('demo-tecnoservizi', { company: 'Tecno Servizi', contactName: 'Anna Galli', status: 'potenziale', customerType: 'end-user', segment: 'industria', sector: 'Manutenzioni', city: 'Lecco', province: 'LC', lat: 45.8566, lng: 9.3977, role: 'Ufficio Acquisti' }),
    c('demo-emporiopro', { company: 'Emporio Pro Lavoro', contactName: 'Luca Moretti', status: 'cliente', customerType: 'dealer', segment: 'dealer', sector: 'Rivendita', city: 'Cremona', province: 'CR', lat: 45.1332, lng: 10.0227 }),
    c('demo-logisticanord', { company: 'Logistica Nord', contactName: 'Elena Conti', status: 'potenziale', customerType: 'end-user', segment: 'industria', sector: 'Logistica', city: 'Lodi', province: 'LO', lat: 45.3097, lng: 9.5037, role: 'HR Manager' }),
    c('demo-cantierebrambilla', { company: 'Brambilla Scavi', contactName: 'Davide Brambilla', status: 'cliente', customerType: 'end-user', segment: 'edilizia', sector: 'Edilizia', city: 'Varese', province: 'VA', lat: 45.8206, lng: 8.8251 }),
    c('demo-elettrogamma', { company: 'Elettro Gamma', contactName: 'Chiara Fontana', status: 'potenziale', customerType: 'end-user', segment: 'industria', sector: 'Impiantistica', city: 'Pavia', province: 'PV', lat: 45.1847, lng: 9.1582 }),
  ];

  const p = (id: string, name: string, code: string, category: string, price: number, line?: Product['line']): Product =>
    ({ id, code, name, description: name, category, price, discount: 0, line, sizes: 'S-XXL', colors: ['nero', 'grigio'] });
  const products = [
    p('demo-p-pant', 'Pantalone da lavoro con tasche flottanti', 'DEMO-1900', 'pantaloni', 89, 'X1900'),
    p('demo-p-giacca', 'Giacca invernale imbottita', 'DEMO-4930', 'giacche', 145, 'X1900'),
    p('demo-p-felpa', 'Felpa con zip intera', 'DEMO-3365', 'felpe', 59, 'Knitwear'),
    p('demo-p-hivis', 'Giubbino alta visibilità classe 2', 'DEMO-4064', 'hivis', 99, 'HiVis'),
    p('demo-p-tshirt', 'T-shirt tecnica', 'DEMO-3525', 'tshirt', 22, 'X1500'),
    p('demo-p-softshell', 'Giacca softshell', 'DEMO-4949', 'giacche', 119, 'Softshell'),
  ];

  const d = (id: string, contactId: string, stage: Deal['stage'], value: number, probability: number, nextAction: string, inDays: number, fields: Partial<Deal> = {}): Deal => ({
    id, contactId, stage, value, probability, nextAction, nextActionDeadline: at(now, inDays, 10), products: [], notes: '',
    nextActionType: 'chiama', nextActionPriority: 'media', createdAt: now - 40 * DAY, updatedAt: now - 3 * DAY, ...fields,
  });
  const deals = [
    d('demo-d-1', 'demo-edilrossi', 'negoziazione', 12400, 75, 'Chiamare per confermare quantità e taglie', 0, { nextActionPriority: 'alta', products: ['Pantalone X1900', 'Giacca invernale'], notes: 'Divise invernali per 45 operai.', closingDate: at(now, 10) }),
    d('demo-d-2', 'demo-impiantiverdi', 'proposta', 6800, 50, 'Inviare offerta alta visibilità', 1, { nextActionType: 'invia-offerta', products: ['Giubbino alta visibilità'] }),
    d('demo-d-3', 'demo-metalmeccanica', 'qualificato', 9500, 30, 'Fissare visita in reparto', 3, { nextActionType: 'fissa-visita' }),
    d('demo-d-4', 'demo-tecnoservizi', 'lead', 4200, 15, 'Mandare catalogo via email', -1, { nextActionType: 'email', nextActionPriority: 'alta' }),
    d('demo-d-5', 'demo-logisticanord', 'proposta', 15800, 45, 'Richiamare HR dopo la riunione budget', 5, { closingDate: at(now, 25) }),
    d('demo-d-6', 'demo-ferramentabianchi', 'chiuso-vinto', 7300, 100, 'Ordine consegnato', -6, { closedAt: now - 6 * DAY }),
    d('demo-d-7', 'demo-cantierebrambilla', 'chiuso-vinto', 5100, 100, 'Ordine consegnato', -18, { closedAt: now - 18 * DAY }),
    d('demo-d-8', 'demo-elettrogamma', 'chiuso-perso', 3900, 0, 'Ricontattare tra sei mesi', 160, { closedAt: now - 12 * DAY, lostReason: 'prezzo', competitor: 'Fornitore locale' }),
    d('demo-d-9', 'demo-autoservice', 'negoziazione', 3600, 70, 'Chiudere sconto su felpe', 2, { products: ['Felpa con zip'] }),
  ];

  const o = (id: string, contactId: string, num: string, daysAgo: number, status: Offer['status'], items: [string, string, number, number][]): Offer => {
    const rows = items.map(([pid, desc, qty, price], i) => ({ id: `${id}-r${i}`, productId: pid, description: desc, quantity: qty, price, discount: 10 }));
    return { id, contactId, offerNumber: num, date: now - daysAgo * DAY, items: rows, status, followUpDate: now + 3 * DAY, contactMode: 'end-user',
      totalAmount: Math.round(rows.reduce((s, r) => s + r.quantity * r.price * (1 - r.discount / 100), 0)), deliveryTime: '15 giorni lavorativi' };
  };
  const year = new Date(now).getFullYear();
  const offers = [
    o('demo-o-1', 'demo-edilrossi', `${year}/041`, 6, 'inviata', [['demo-p-pant', 'Pantalone da lavoro con tasche flottanti', 90, 89], ['demo-p-giacca', 'Giacca invernale imbottita', 45, 145]]),
    o('demo-o-2', 'demo-ferramentabianchi', `${year}/038`, 14, 'accettata', [['demo-p-felpa', 'Felpa con zip intera', 60, 59], ['demo-p-tshirt', 'T-shirt tecnica', 120, 22]]),
    o('demo-o-3', 'demo-autoservice', `${year}/042`, 3, 'bozza', [['demo-p-felpa', 'Felpa con zip intera', 40, 59]]),
    o('demo-o-4', 'demo-elettrogamma', `${year}/033`, 30, 'rifiutata', [['demo-p-softshell', 'Giacca softshell', 30, 119]]),
  ];

  const a = (id: string, contactId: string, type: Activity['type'], days: number, hour: number, outcome: string, notes: string, fields: Partial<Activity> = {}): Activity =>
    ({ id, contactId, type, date: at(now, days, hour), endDate: at(now, days, hour + 1), outcome, notes, createdAt: now - 20 * DAY, source: 'manual', ...fields });
  const activities = [
    a('demo-a-1', 'demo-edilrossi', 'visita', 0, 10, 'da-fare', 'Prova taglie in cantiere con il capocantiere'),
    a('demo-a-2', 'demo-autoservice', 'chiamata', 0, 15, 'da-fare', 'Definire lo sconto sulle felpe'),
    a('demo-a-3', 'demo-metalmeccanica', 'visita', 1, 11, 'da-fare', 'Sopralluogo in reparto produzione'),
    a('demo-a-4', 'demo-impiantiverdi', 'demo', 2, 14, 'da-fare', 'Presentazione capi alta visibilità'),
    a('demo-a-5', 'demo-logisticanord', 'call-remota', 3, 9, 'da-fare', 'Call con HR e responsabile magazzino'),
    a('demo-a-6', 'demo-ferramentabianchi', 'visita', 4, 10, 'da-fare', 'Riassortimento banco vendita'),
    a('demo-a-7', 'demo-edilrossi', 'chiamata', -2, 16, 'fatto', 'Chiesto preventivo per 45 operai', { outcomeType: 'richiesta-offerta' }),
    a('demo-a-8', 'demo-ferramentabianchi', 'visita', -6, 10, 'fatto', 'Ordine firmato al banco', { outcomeType: 'riuscita' }),
    a('demo-a-9', 'demo-tecnoservizi', 'visita-freddo', -4, 11, 'fatto', 'Parlato con l’ufficio acquisti, mandare catalogo', { outcomeType: 'parlato-influente' }),
    a('demo-a-10', 'demo-elettrogamma', 'email', -12, 9, 'fatto', 'Offerta rifiutata: prezzo troppo alto', { outcomeType: 'rifiuto' }),
    a('demo-a-11', 'demo-cantierebrambilla', 'visita', -18, 14, 'fatto', 'Consegna ordine e foto in cantiere', { outcomeType: 'riuscita' }),
    a('demo-a-12', 'demo-metalmeccanica', 'chiamata', -8, 12, 'fatto', 'Interessati, vogliono vedere i capi in reparto', { outcomeType: 'appuntamento-fissato' }),
  ];

  const t = (id: string, titolo: string, tipo: TodoItem['tipo'], priorita: TodoItem['priorita'], scadenzaDays: number, contactId?: string, fields: Partial<TodoItem> = {}): TodoItem =>
    ({ id, titolo, tipo, priorita, status: 'da-fare', scadenza: isoDay(now, scadenzaDays), contactId, createdAt: now - 5 * DAY, source: 'manuale', ...fields });
  const todos = [
    t('demo-t-1', 'Preparare offerta alta visibilità per Impianti Verdi', 'offerta', 'alta', 0, 'demo-impiantiverdi', { dealId: 'demo-d-2' }),
    t('demo-t-2', 'Inviare scheda tecnica giacca invernale', 'scheda-tecnica', 'media', 1, 'demo-edilrossi'),
    t('demo-t-3', 'Richiamare Tecno Servizi per il catalogo', 'chiamata-follow', 'alta', -1, 'demo-tecnoservizi'),
    t('demo-t-4', 'Portare campioni felpe ad Autoservice', 'campionatura', 'media', 2, 'demo-autoservice'),
    t('demo-t-5', 'Mandare listino aggiornato a Emporio Pro', 'email-info', 'bassa', 5, 'demo-emporiopro'),
    t('demo-t-6', 'Follow-up offerta Ferramenta Bianchi', 'chiamata-follow', 'media', -7, 'demo-ferramentabianchi', { status: 'fatto', completedAt: now - 6 * DAY, esito: 'ordine', esitoAt: now - 6 * DAY }),
    t('demo-t-7', 'Demo capi a Elettro Gamma', 'demo', 'media', -13, 'demo-elettrogamma', { status: 'fatto', completedAt: now - 12 * DAY, esito: 'non-interessato', esitoAt: now - 12 * DAY }),
  ];

  // Vendite degli ultimi 12 mesi, per grafici e numeri
  const buyers = ['demo-edilrossi', 'demo-ferramentabianchi', 'demo-metalmeccanica', 'demo-autoservice', 'demo-emporiopro', 'demo-cantierebrambilla'];
  const sales: SalesTransaction[] = [];
  for (let m = 0; m < 12; m++) {
    for (let k = 0; k < 3; k++) {
      const prod = products[(m + k) % products.length];
      const qty = 10 + ((m * 7 + k * 13) % 40);
      const date = now - (m * 30 + k * 9 + 2) * DAY;
      sales.push({ id: `demo-s-${m}-${k}`, date, contactId: buyers[(m + k) % buyers.length], productName: prod.name ?? prod.description, quantity: qty,
        unitPrice: prod.price, totalAmount: qty * prod.price, stage: 'chiuso-vinto', createdAt: date });
    }
  }

  const groups: Group[] = [{ id: 'demo-gruppo-cantieri', nome: 'Imprese edili Bergamo e Como', tipo: 'end-user-account', priorita: 'alta', stato: 'in-corso',
    obiettivo: 'Diventare il fornitore di divise di 5 imprese entro l’estate', prossimaAzione: 'Giro visite in cantiere', prossimaAzioneScadenza: isoDay(now, 7),
    dataInizio: isoDay(now, -30), dataFinePrevista: isoDay(now, 150), createdAt: now - 30 * DAY, updatedAt: now - 2 * DAY }];
  const strategicFocuses: StrategicFocus[] = [
    { id: 'demo-f-1', contactId: 'demo-logisticanord', priorita: 'alta', stato: 'in-corso', obiettivo: 'Primo ordine entro fine trimestre', prossimaAzione: 'Call con HR', prossimaAzioneScadenza: isoDay(now, 3), createdAt: now - 10 * DAY, updatedAt: now - 1 * DAY },
    { id: 'demo-f-2', contactId: 'demo-metalmeccanica', priorita: 'media', stato: 'da-avvicinare', obiettivo: 'Allargare la fornitura al reparto manutenzione', createdAt: now - 10 * DAY, updatedAt: now - 1 * DAY },
  ];

  return {
    contacts: byId(contacts), deals: byId(deals), offers: byId(offers), products: byId(products), activities: byId(activities),
    todos: byId(todos), salesTransactions: byId(sales), groups: byId(groups), strategicFocuses: byId(strategicFocuses),
  };
}
