import React from 'react';
import { Phone, MapPin, ExternalLink, Pencil, Trash2, CheckCircle, Eye, RotateCcw } from 'lucide-react';
import { Activity } from '../../types';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { TYPE_LABELS, TYPE_COLORS, TYPE_BG, OUTCOME_OPTIONS } from './agendaShared';

// Card delle attività in Agenda: trascinabili, slot della griglia oraria e card dell'elenco.
export interface DraggableCardProps {
  activity: Activity;
  company: string;
  onEdit: () => void;
}

export const DraggableCard: React.FC<DraggableCardProps> = ({ activity, company, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: activity.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 999 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-md px-2 py-1.5 text-xs font-semibold truncate cursor-grab active:cursor-grabbing select-none transition-opacity ${TYPE_COLORS[activity.type]} ${isDragging ? 'opacity-40' : 'opacity-100'}`}
      onClick={e => { e.stopPropagation(); onEdit(); }}
    >
      {company}
    </div>
  );
};

export interface DroppableSlotProps {
  id: string;
  children?: React.ReactNode;
  isHour: boolean;
}

export const DroppableSlot: React.FC<DroppableSlotProps> = ({ id, children, isHour }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`relative border-b transition-colors ${
        isHour
          ? 'border-line dark:border-line'
          : 'border-line dark:border-line'
      } ${isOver ? 'bg-accent-soft dark:bg-accent-soft/20' : ''}`}
      style={{ height: 28 }}
    >
      {children}
    </div>
  );
};

// ─── Activity Card ────────────────────────────────────────────────────────────

export interface ActivityCardProps {
  activity: Activity;
  companyName: string;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClose: () => void;
  onView: () => void;
  onNavigateToContact?: (contactId: string) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, companyName, onEdit, onDelete, onExport, onClose, onView, onNavigateToContact }) => {
  const isDone = activity.outcome !== 'da-fare';
  return (
    <div className={`bg-surface dark:bg-surface p-4 rounded-panel shadow-sm border flex items-center justify-between gap-4 ${isDone ? 'border-success dark:border-success opacity-75' : 'border-line dark:border-line'}`}>
      <div className="flex gap-3 items-center flex-1 min-w-0 cursor-pointer" onClick={onView} title="Apri per vedere i dettagli">
        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${TYPE_BG[activity.type]}`}>
          {activity.type === 'visita' ? <MapPin size={16} /> : activity.type === 'chiamata' ? <Phone size={16} /> : <span className="text-xs font-semibold">{TYPE_LABELS[activity.type][0]}</span>}
        </div>
        <div className="min-w-0">
          {onNavigateToContact && activity.contactId ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onNavigateToContact(activity.contactId); }}
              className="font-semibold text-sm text-accent dark:text-accent truncate hover:underline text-left"
            >{companyName}</button>
          ) : (
            <p className="font-semibold text-sm dark:text-foreground truncate">{companyName}</p>
          )}
          <p className="text-xs text-muted font-bold">
            {new Date(activity.date).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {activity.endDate && ` – ${new Date(activity.endDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
          {activity.notes && <p className="text-xs text-muted truncate mt-0.5">{activity.notes}</p>}
          {activity.results && (
            <p className="text-xs text-success dark:text-success truncate mt-0.5 italic">✓ {activity.results}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_BG[activity.type]}`}>
              {TYPE_LABELS[activity.type]}
            </span>
            {isDone && activity.outcomeType && (
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-success-soft text-success dark:bg-success-soft dark:text-success">
                {OUTCOME_OPTIONS.find(o => o.value === activity.outcomeType)?.label ?? activity.outcomeType}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onClose}
          className={`p-2 rounded-xl transition-colors ${isDone ? 'text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20' : 'text-muted hover:text-success hover:bg-success-soft dark:hover:bg-success-soft'}`}
          title={isDone ? 'Modifica esito' : 'Chiudi appuntamento'}
        >
          {isDone ? <RotateCcw size={16} /> : <CheckCircle size={16} />}
        </button>
        <button onClick={onView} className="p-2 rounded-md text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/30 transition-colors" title="Apri / vedi dettagli"><Eye size={14} /></button>
        <button onClick={onExport} className="p-2 rounded-md text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/30 transition-colors" title="Aggiungi a Outlook"><ExternalLink size={14} /></button>
        <button onClick={onEdit} className="p-2 rounded-md text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/30 transition-colors" title="Modifica"><Pencil size={14} /></button>
        <button onClick={onDelete} className="p-2 rounded-md text-muted hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors" title="Elimina"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
