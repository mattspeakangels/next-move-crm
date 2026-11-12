import React, { useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { useStore } from '../../store/useStore';

// Programma attività del cliente nella scheda.
export const InlineProgrammaSection: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { activities, addActivity, deleteActivity } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<'visita' | 'chiamata' | 'email'>('visita');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  const planned = Object.values(activities)
    .filter(a => a.contactId === contactId && a.outcome === 'da-fare')
    .sort((a, b) => a.date - b.date);

  const handleAdd = () => {
    addActivity({
      id: `act_${Date.now()}`,
      contactId,
      type: newType,
      date: new Date(newDate).getTime(),
      outcome: 'da-fare',
      notes: newNotes,
      createdAt: Date.now(),
    });
    setNewNotes('');
    setShowForm(false);
  };

  const TYPE_CONFIG = {
    visita:   { label: 'Visita',    color: 'text-accent', bg: 'bg-accent-soft dark:bg-accent-soft/40' },
    chiamata: { label: 'Chiamata',  color: 'text-success',  bg: 'bg-success-soft dark:bg-success-soft'   },
    email:    { label: 'Email',     color: 'text-accent',   bg: 'bg-accent-soft dark:bg-accent-soft/40'     },
  };

  return (
    <section>
      <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2">
        <Calendar size={16} /> 5. Programma Attività
        <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{planned.length} programmate</span>
      </h3>
      {planned.length === 0 && !showForm && (
        <p className="text-xs text-muted font-bold italic mb-3">Nessuna attività programmata</p>
      )}
      {planned.length > 0 && (
        <div className="space-y-2 mb-3">
          {planned.map(act => {
            const cfg = TYPE_CONFIG[act.type as 'visita' | 'chiamata' | 'email'] ?? TYPE_CONFIG['visita'];
            const isPast = act.date < Date.now();
            return (
              <div key={act.id} className={`bg-surface dark:bg-surface rounded-panel p-3 flex items-center gap-3 shadow-sm ${isPast ? 'border border-warning dark:border-warning' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bg} ${cfg.color} text-xs font-semibold`}>
                  {cfg.label[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-xs dark:text-foreground">{cfg.label}</p>
                    <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded-full ${isPast ? 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning' : 'bg-raised text-secondary dark:bg-raised dark:text-muted'}`}>
                      {isPast ? 'Scaduta' : 'In attesa'}
                    </span>
                  </div>
                  <p className="text-xs text-muted font-bold">{new Date(act.date).toLocaleDateString('it-IT')}{act.notes ? ` · ${act.notes}` : ''}</p>
                </div>
                <button onClick={() => deleteActivity(act.id)}
                  className="p-1.5 text-muted hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft rounded-lg transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border-2 border-accent dark:border-accent mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={newType} onChange={e => setNewType(e.target.value as typeof newType)}
              className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-surface dark:bg-raised dark:text-foreground text-sm font-bold outline-none focus:border-accent">
              <option value="visita">Visita</option>
              <option value="chiamata">Chiamata</option>
              <option value="email">Email</option>
            </select>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-transparent dark:text-foreground text-sm font-bold outline-none focus:border-accent" />
          </div>
          <input type="text" placeholder="Note (opzionale)" value={newNotes} onChange={e => setNewNotes(e.target.value)}
            className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-transparent dark:text-foreground text-sm font-bold outline-none focus:border-accent" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-md bg-action text-action-foreground font-semibold text-xs uppercase">Aggiungi</button>
            <button onClick={() => setShowForm(false)} className="py-2.5 px-4 rounded-md bg-raised dark:bg-raised text-secondary font-semibold text-xs uppercase">Annulla</button>
          </div>
        </div>
      )}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/20 px-3 py-2 rounded-md uppercase hover:bg-accent-soft transition-colors">
          <Plus size={12} /> Programma attività
        </button>
      )}
    </section>
  );
};
