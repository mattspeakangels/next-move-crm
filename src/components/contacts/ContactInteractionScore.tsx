import { Activity } from 'lucide-react';
import { ContactsModel } from './useContactsView';

export function ContactInteractionScore({ v }: { v: ContactsModel }) {
  const { contacts, activities, editingContact } = v;
  return (
    <>
      {editingContact?.id && contacts[editingContact.id] && (() => {
        const contactActivities = Object.values(activities).filter(a => a.contactId === editingContact.id);
        const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const recent90 = contactActivities.filter(a => (a.date || 0) >= cutoff90);
        const lastActivity = contactActivities.length > 0
          ? Math.max(...contactActivities.map(a => a.date || 0)) : null;
        const isSilent = !lastActivity || lastActivity < cutoff90;
        const activityTypes = recent90.reduce((acc, a) => {
          acc[a.type] = (acc[a.type] || 0) + 1; return acc;
        }, {} as Record<string, number>);
        return (
          <section className={`rounded-panel p-4 border-2 ${isSilent ? 'border-warning bg-warning-soft dark:bg-warning-soft dark:border-warning' : 'border-success bg-success-soft dark:bg-success-soft dark:border-success'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className={isSilent ? 'text-warning' : 'text-success'} />
              <h3 className="text-xs font-semibold text-secondary  ">Interaction Score</h3>
              {isSilent && <span className="text-xs font-semibold bg-warning-soft text-warning px-2 py-0.5 rounded-full uppercase">SILENTE</span>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-semibold dark:text-foreground">{recent90.length}</p>
                <p className="text-xs font-semibold uppercase text-muted tracking-normal">Attività 90gg</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold dark:text-foreground">{contactActivities.length}</p>
                <p className="text-xs font-semibold uppercase text-muted tracking-normal">Totali</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold dark:text-foreground">
                  {lastActivity ? `${Math.floor((Date.now() - lastActivity) / (24 * 60 * 60 * 1000))}gg fa` : '—'}
                </p>
                <p className="text-xs font-semibold uppercase text-muted tracking-normal">Ultima att.</p>
              </div>
            </div>
            {Object.keys(activityTypes).length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {Object.entries(activityTypes).map(([type, count]) => (
                  <span key={type} className="text-xs font-semibold bg-surface dark:bg-surface border border-line dark:border-line text-secondary dark:text-muted px-2 py-1 rounded-lg uppercase">
                    {type}: {count}
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })()}
    </>
  );
}
