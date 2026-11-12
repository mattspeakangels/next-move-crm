import { Activity, ActivityType, ActivityOutcome, ProspectingSettore } from '../../types';

// Tipi, costanti e funzioni di data condivise dall'Agenda.
export type FormData = {
  /** Clienti selezionati (uno solo per la maggior parte dei tipi, più di uno per Formazione). */
  contactIds: string[];
  type: ActivityType;
  date: string;
  time: string;
  endTime: string;
  /** Giorno di fine per attività multi-giorno (es. Fiera). Vuoto = un solo giorno. */
  endDateDay: string;
  /** Evento per tutto il giorno lavorativo (orari fissati a WORK_DAY_START/END). */
  allDay: boolean;
  notes: string;
};

export type CalendarMode = 'month' | 'week' | 'list';

export const WORK_DAY_START = '08:00';
export const WORK_DAY_END = '18:00';

export const defaultForm = (): FormData => ({
  contactIds: [],
  type: 'visita',
  date: '',
  time: '08:00',
  endTime: '09:00',
  endDateDay: '',
  allDay: false,
  notes: '',
});

// Somma minuti a un orario "HH:MM" restando nello stesso giorno (clamp a 23:59)
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number);
  const total = Math.max(0, Math.min(h * 60 + m + minutes, 23 * 60 + 59));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const TYPE_LABELS: Record<ActivityType, string> = {
  chiamata: 'Chiamata',
  email: 'Email',
  visita: 'Visita',
  'visita-freddo': 'Visita a freddo',
  nota: 'Nota',
  demo: 'Demo',
  'call-remota': 'Call Remota',
  sopralluogo: 'Sopralluogo',
  formazione: 'Formazione',
  'smart-working': 'Smart Working',
  ufficio: 'Ufficio',
  fiera: 'Fiera',
  'giornata-banco': 'Giornata al banco',
  'mini-fiera': 'Mini fiera dal cliente',
  'manutenzione-auto': 'Manutenzione auto',
};

// Categorie che non richiedono un'azienda/contatto per essere salvate
export const NO_CONTACT_TYPES: ActivityType[] = ['smart-working', 'ufficio', 'fiera', 'manutenzione-auto'];

// Categorie che possono coinvolgere più clienti nello stesso appuntamento
export const MULTI_CONTACT_TYPES: ActivityType[] = ['formazione'];

// Categorie che possono estendersi su più giorni consecutivi (mostra il campo "Fino al")
export const MULTI_DAY_TYPES: ActivityType[] = ['fiera'];
// Tipologie "visita in loco": l'orario deve sempre restare nella fascia 08:00-18:00
export const VISIT_TYPES: ActivityType[] = ['visita', 'visita-freddo', 'sopralluogo', 'demo'];

export const TYPE_COLORS: Record<ActivityType, string> = {
  visita: 'bg-action text-action-foreground',
  'visita-freddo': 'bg-action text-action-foreground',
  chiamata: 'bg-success text-status-foreground',
  email: 'bg-action text-action-foreground',
  nota: 'bg-warning text-status-foreground',
  demo: 'bg-action text-action-foreground',
  'call-remota': 'bg-success text-status-foreground',
  sopralluogo: 'bg-warning text-status-foreground',
  formazione: 'bg-action text-action-foreground',
  'smart-working': 'bg-action text-action-foreground',
  ufficio: 'bg-raised',
  fiera: 'bg-action text-action-foreground',
  'giornata-banco': 'bg-warning text-status-foreground',
  'mini-fiera': 'bg-action text-action-foreground',
  'manutenzione-auto': 'bg-raised',
};

export const TYPE_BG: Record<ActivityType, string> = {
  visita: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'visita-freddo': 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  chiamata: 'bg-success-soft dark:bg-success-soft text-success dark:text-success',
  email: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  nota: 'bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning',
  demo: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'call-remota': 'bg-accent-soft text-accent',
  sopralluogo: 'bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning',
  formazione: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'smart-working': 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  ufficio: 'bg-raised dark:bg-raised/40 text-foreground dark:text-muted',
  fiera: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'giornata-banco': 'bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning',
  'mini-fiera': 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'manutenzione-auto': 'bg-raised dark:bg-raised/40 text-foreground dark:text-muted',
};

export const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export const OUTCOME_OPTIONS: { value: ActivityOutcome; label: string; emoji: string; color: string }[] = [
  { value: 'riuscita',          label: 'Positivo',    emoji: '✅', color: 'border-success bg-success-soft dark:bg-success-soft text-success dark:text-success' },
  { value: 'parziale',          label: 'Parziale',    emoji: '🟡', color: 'border-warning bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning' },
  { value: 'promessa-callback', label: 'Richiamata',  emoji: '📞', color: 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' },
  { value: 'rifiuto',           label: 'Non riuscita',emoji: '❌', color: 'border-danger bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger' },
  { value: 'richiesta-offerta', label: 'Richiesta offerta', emoji: '📄', color: 'border-success bg-success-soft dark:bg-success-soft text-success dark:text-success' },
];

// Esiti specifici per "Visita a freddo" (Manuale Prospezione Blaklader §4)
export const VISITA_FREDDO_OUTCOME_OPTIONS: { value: ActivityOutcome; label: string; emoji: string; color: string }[] = [
  { value: 'nessuno-trovato',      label: 'Nessuno trovato',       emoji: '🚪', color: 'border-line bg-canvas dark:bg-raised/30 text-foreground dark:text-muted' },
  { value: 'parlato-influente',    label: 'Parlato con influente', emoji: '🗣️', color: 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' },
  { value: 'parlato-decisore',     label: 'Parlato col decisore',  emoji: '🎯', color: 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' },
  { value: 'appuntamento-fissato', label: 'Appuntamento fissato',  emoji: '📅', color: 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' },
  { value: 'richiesta-offerta',    label: 'Richiesta offerta',     emoji: '📄', color: 'border-success bg-success-soft dark:bg-success-soft text-success dark:text-success' },
];

export const SETTORE_OPTIONS: { value: ProspectingSettore; label: string }[] = [
  { value: 'industria',  label: 'Industria' },
  { value: 'edilizia',   label: 'Edilizia' },
  { value: 'rivendita',  label: 'Rivendita' },
  { value: 'ferramenta', label: 'Ferramenta' },
];

// Esiti visita a freddo che avviano una sequenza di prospecting (tocco iniziale > 0)
export const VISITA_FREDDO_AVVIA_SEQUENZA: ActivityOutcome[] = ['nessuno-trovato', 'parlato-influente', 'parlato-decisore'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Chiave numerica giorno (ignora l'orario) per confrontare/ordinare date senza problemi di fuso
export function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// Un'attività "occupa" un giorno se questo cade tra il giorno di inizio e quello di fine
// (endDate può ricadere su un giorno diverso per eventi multi-giorno tipo Fiera)
export function activityOccursOnDay(a: Activity, day: Date): boolean {
  const k = dayKey(day);
  const startKey = dayKey(new Date(a.date));
  const endKey = a.endDate ? dayKey(new Date(a.endDate)) : startKey;
  return k >= startKey && k <= endKey;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day; // lunedì
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  // Pad to Monday
  let start = startOfWeek(firstDay);
  // Generate 6 weeks
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start));
    start = new Date(start);
    start.setDate(start.getDate() + 1);
  }
  return days;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// ─── Week Timegrid DnD ───────────────────────────────────────────────────────

export const HOUR_START = 7;   // 07:00
export const HOUR_END   = 21;  // 21:00
export const SLOT_MINS  = 30;  // slot da 30 min
export const SLOTS_PER_DAY = ((HOUR_END - HOUR_START) * 60) / SLOT_MINS; // 28

export function slotId(dayIdx: number, slotIdx: number) {
  return `slot-${dayIdx}-${slotIdx}`;
}

export function slotToTime(slotIdx: number): { h: number; m: number } {
  const totalMins = HOUR_START * 60 + slotIdx * SLOT_MINS;
  return { h: Math.floor(totalMins / 60), m: totalMins % 60 };
}
