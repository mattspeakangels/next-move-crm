import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Phone, MapPin, ExternalLink, Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Activity, ActivityType } from '../types';
import { useToast } from '../components/ui/ToastContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  contactId: string;
  type: ActivityType;
  date: string;
  time: string;
  notes: string;
};

type CalendarMode = 'month' | 'week' | 'list';

const defaultForm = (): FormData => ({
  contactId: '',
  type: 'visita',
  date: '',
  time: '09:00',
  notes: '',
});

const TYPE_LABELS: Record<ActivityType, string> = {
  chiamata: 'Chiamata',
  email: 'Email',
  visita: 'Visita',
  nota: 'Nota',
};

const TYPE_COLORS: Record<ActivityType, string> = {
  visita: 'bg-indigo-500',
  chiamata: 'bg-green-500',
  email: 'bg-blue-500',
  nota: 'bg-yellow-400',
};

const TYPE_BG: Record<ActivityType, string> = {
  visita: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  chiamata: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  email: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  nota: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
};

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day; // lunedì
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysInMonth(year: number, month: number): Date[] {
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

function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// ─── Activity Card ────────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: Activity;
  companyName: string;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, companyName, onEdit, onDelete, onExport }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-gray-700 flex items-center justify-between gap-4">
    <div className="flex gap-3 items-center flex-1 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${TYPE_BG[activity.type]}`}>
        {activity.type === 'visita' ? <MapPin size={16} /> : activity.type === 'chiamata' ? <Phone size={16} /> : <span className="text-xs font-black">{TYPE_LABELS[activity.type][0]}</span>}
      </div>
      <div className="min-w-0">
        <p className="font-black text-sm dark:text-white truncate">{companyName}</p>
        <p className="text-xs text-gray-400 font-bold">
          {new Date(activity.date).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
        {activity.notes && <p className="text-[11px] text-gray-400 truncate mt-0.5">{activity.notes}</p>}
        <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_BG[activity.type]}`}>
          {TYPE_LABELS[activity.type]}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-1 flex-shrink-0">
      <button onClick={onExport} className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Google Calendar"><ExternalLink size={14} /></button>
      <button onClick={onEdit} className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Modifica"><Pencil size={14} /></button>
      <button onClick={onDelete} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Elimina"><Trash2 size={14} /></button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AgendaView: React.FC = () => {
  const { activities, addActivity, updateActivity, deleteActivity, contacts } = useStore();
  const { showToast } = useToast();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calendar state
  const [calMode, setCalMode] = useState<CalendarMode>('month');
  const [anchor, setAnchor] = useState(new Date()); // month or week anchor
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm());

  const allActivities = Object.values(activities);

  // Activities for a given day
  const activitiesForDay = (day: Date) =>
    allActivities.filter(a => isSameDay(new Date(a.date), day)).sort((a, b) => a.date - b.date);

  // Activities shown in list (all upcoming or selected day)
  const listActivities = selectedDay
    ? activitiesForDay(selectedDay)
    : allActivities.filter(a => a.date >= today.getTime()).sort((a, b) => a.date - b.date);

  // ── Modal helpers ──

  const openNew = (prefillDate?: Date) => {
    setEditingId(null);
    const d = prefillDate ?? new Date();
    setFormData({
      ...defaultForm(),
      date: d.toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openEdit = (activity: Activity) => {
    const d = new Date(activity.date);
    setEditingId(activity.id);
    setFormData({
      contactId: activity.contactId,
      type: activity.type,
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      notes: activity.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setFormData(defaultForm()); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactId) { showToast("Seleziona un'azienda", 'error'); return; }
    const dateTime = new Date(`${formData.date}T${formData.time}`).getTime();
    if (editingId) {
      updateActivity(editingId, { contactId: formData.contactId, type: formData.type, date: dateTime, notes: formData.notes });
      showToast('Attività aggiornata!', 'success');
    } else {
      addActivity({ id: `act_${Date.now()}`, contactId: formData.contactId, type: formData.type, date: dateTime, outcome: 'da-fare', notes: formData.notes, createdAt: Date.now() });
      showToast('Attività salvata!', 'success');
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteActivity(id);
    setConfirmDeleteId(null);
    showToast('Attività eliminata', 'success');
  };

  const handleExport = (activity: Activity) => {
    const contact = contacts[activity.contactId];
    const title = encodeURIComponent(`${activity.type.toUpperCase()} - ${contact?.company || 'Cliente'}`);
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`, '_blank');
  };

  // ── Navigation ──

  const prevPeriod = () => {
    const d = new Date(anchor);
    if (calMode === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setAnchor(d);
  };

  const nextPeriod = () => {
    const d = new Date(anchor);
    if (calMode === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setAnchor(d);
  };

  const goToday = () => { setAnchor(new Date()); setSelectedDay(new Date()); };

  // ── Calendar renders ──

  const renderMonthHeader = () => `${MONTHS_IT[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const renderWeekHeader = () => {
    const days = getWeekDays(anchor);
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${MONTHS_IT[start.getMonth()]} ${start.getFullYear()}`;
    return `${start.getDate()} ${MONTHS_IT[start.getMonth()]} – ${end.getDate()} ${MONTHS_IT[end.getMonth()]} ${end.getFullYear()}`;
  };

  // Month grid
  const renderMonthGrid = () => {
    const days = getDaysInMonth(anchor.getFullYear(), anchor.getMonth());
    const currentMonth = anchor.getMonth();

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_IT.map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-2">{d}</div>
          ))}
        </div>
        {/* Day cells — 6 rows × 7 cols */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const dayActivities = activitiesForDay(day);

            return (
              <button
                key={i}
                onClick={() => { setSelectedDay(isSameDay(day, selectedDay ?? new Date(-1)) ? null : day); }}
                className={`relative flex flex-col items-center py-2 rounded-xl transition-all text-sm font-bold min-h-[52px] ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : isToday
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                    : isCurrentMonth
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                <span className={`text-xs font-black ${isToday && !isSelected ? 'text-indigo-600' : ''}`}>{day.getDate()}</span>
                {/* Activity dots */}
                {dayActivities.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                    {dayActivities.slice(0, 3).map((a, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : TYPE_COLORS[a.type]}`} />
                    ))}
                    {dayActivities.length > 3 && (
                      <span className={`text-[8px] font-black ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>+{dayActivities.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Week strip
  const renderWeekGrid = () => {
    const days = getWeekDays(anchor);
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const dayActivities = activitiesForDay(day);

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`flex flex-col items-center py-3 rounded-2xl transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : isToday
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wide mb-1 opacity-70">{DAYS_IT[i]}</span>
              <span className="text-lg font-black">{day.getDate()}</span>
              {dayActivities.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                  {dayActivities.slice(0, 3).map((a, j) => (
                    <span key={j} className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/80' : TYPE_COLORS[a.type]}`} />
                  ))}
                </div>
              )}
              {dayActivities.length === 0 && <span className="w-2 h-2 mt-1.5" />}
            </button>
          );
        })}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-20">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black dark:text-white">Agenda</h1>
        <button
          onClick={() => openNew(selectedDay ?? undefined)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus size={16} /> Nuova
        </button>
      </div>

      {/* Calendar card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-700 overflow-hidden">

        {/* Calendar toolbar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button onClick={prevPeriod} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><ChevronLeft size={18} /></button>
            <span className="font-black text-sm dark:text-white min-w-[160px] text-center">
              {calMode === 'month' ? renderMonthHeader() : calMode === 'week' ? renderWeekHeader() : 'Tutte le attività'}
            </span>
            <button onClick={nextPeriod} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><ChevronRight size={18} /></button>
            <button onClick={goToday} className="ml-1 text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full uppercase tracking-wide hover:bg-indigo-100 transition-colors">Oggi</button>
          </div>

          {/* View switcher */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            {(['month', 'week', 'list'] as CalendarMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setCalMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                  calMode === mode ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {mode === 'month' ? 'Mese' : mode === 'week' ? 'Sett.' : 'Lista'}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        {calMode !== 'list' && (
          <div className="p-4">
            {calMode === 'month' ? renderMonthGrid() : renderWeekGrid()}
          </div>
        )}

        {/* Legend */}
        {calMode !== 'list' && (
          <div className="flex gap-4 px-5 pb-4 flex-wrap">
            {(Object.keys(TYPE_LABELS) as ActivityType[]).map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[t]}`} />
                <span className="text-[10px] font-bold text-gray-400">{TYPE_LABELS[t]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {selectedDay
              ? `${selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : calMode === 'list' ? 'Tutti i prossimi appuntamenti' : 'Seleziona un giorno'
            }
          </h2>
          {selectedDay && (
            <button onClick={() => openNew(selectedDay)} className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full uppercase tracking-wide hover:bg-indigo-100 transition-colors">
              + Aggiungi in questa data
            </button>
          )}
        </div>

        {listActivities.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
            <p className="text-gray-300 dark:text-gray-600 font-black uppercase tracking-widest text-xs">
              {selectedDay ? 'Nessun appuntamento in questa data' : 'Nessun appuntamento futuro'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {listActivities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              companyName={contacts[activity.contactId]?.company || 'Azienda'}
              onEdit={() => openEdit(activity)}
              onDelete={() => setConfirmDeleteId(activity.id)}
              onExport={() => handleExport(activity)}
            />
          ))}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black dark:text-white">{editingId ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}</h2>
              <button onClick={closeModal}><X size={24} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Azienda</label>
                <select required value={formData.contactId} onChange={e => setFormData({ ...formData, contactId: e.target.value })} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white outline-none focus:border-indigo-400">
                  <option value="">Seleziona...</option>
                  {Object.values(contacts).sort((a, b) => a.company.localeCompare(b.company)).map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tipo</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_LABELS) as ActivityType[]).map(t => (
                    <button key={t} type="button" onClick={() => setFormData({ ...formData, type: t })} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${formData.type === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>{TYPE_LABELS[t]}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Data</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ora</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white outline-none focus:border-indigo-400" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Note</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Obiettivo della visita, dettagli..." rows={2} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-transparent dark:text-white outline-none focus:border-indigo-400 text-sm resize-none" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-indigo-700 transition-colors">
                {editingId ? 'Aggiorna' : 'Salva'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
            <p className="font-black text-lg dark:text-white mb-2">Elimina appuntamento?</p>
            <p className="text-sm text-gray-400 mb-6">Questa azione non è reversibile.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-2xl font-black bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Annulla</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 py-3 rounded-2xl font-black bg-red-500 text-white hover:bg-red-600 transition-colors">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
