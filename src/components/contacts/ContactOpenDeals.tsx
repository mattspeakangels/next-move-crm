import { Plus, TrendingUp } from 'lucide-react';
import { ContactsModel } from './useContactsView';

export function ContactOpenDeals({ v }: { v: ContactsModel }) {
  const { contacts, deals, editingContact, setAddDealForContact } = v;
  return (
    <>
      {editingContact?.id && contacts[editingContact.id] && (() => {
        const contactDeals = Object.values(deals).filter(
          d => d.contactId === editingContact.id && !['chiuso-vinto', 'chiuso-perso'].includes(d.stage)
        );
        const stageBadge: Record<string, string> = {
          lead: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent',
          qualificato: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent',
          proposta: 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning',
          negoziazione: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent',
        };
        const stageLabels: Record<string, string> = { lead: 'Lead', qualificato: 'Qualificato', proposta: 'Proposta', negoziazione: 'Trattativa' };
        return (
          <section>
            <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2">
              <TrendingUp size={16}/> 6. Deal Aperti
              <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{contactDeals.length}</span>
            </h3>
            <div className="bg-surface dark:bg-surface rounded-panel p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-normal">Opportunità aperte</span>
                <button
                  onClick={() => setAddDealForContact(editingContact.id)}
                  className="text-xs font-semibold text-accent bg-accent-soft px-2 py-1 rounded-full uppercase flex items-center gap-1 hover:bg-accent-soft transition-colors"
                >
                  <Plus size={10}/> Aggiungi
                </button>
              </div>
              {contactDeals.length === 0 ? (
                <p className="text-xs text-muted font-bold italic">Nessun deal aperto</p>
              ) : (
                <div className="space-y-2">
                  {contactDeals.map(deal => {
                    const isPastClosing = deal.closingDate && deal.closingDate < Date.now();
                    const daysToClose = deal.closingDate ? Math.ceil((deal.closingDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                    return (
                      <div key={deal.id} className={`rounded-panel p-3 flex items-center gap-2 ${isPastClosing ? 'bg-danger-soft dark:bg-danger-soft border border-danger dark:border-danger' : 'bg-canvas dark:bg-canvas'}`}>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${stageBadge[deal.stage] || 'bg-raised text-secondary'}`}>
                          {stageLabels[deal.stage] || deal.stage}
                        </span>
                        <span className="font-bold text-xs text-accent">€{deal.value.toLocaleString('it-IT')}</span>
                        {deal.closingDate && (
                          <span className={`text-xs font-semibold ml-auto flex-shrink-0 ${isPastClosing ? 'text-danger' : daysToClose && daysToClose <= 7 ? 'text-warning' : 'text-muted'}`}>
                            {isPastClosing ? `Scaduto ${Math.abs(daysToClose!)}gg fa` : `Chiusura: ${new Date(deal.closingDate).toLocaleDateString('it-IT')}`}
                          </span>
                        )}
                        {deal.nextAction && !deal.closingDate && (
                          <span className="text-xs text-secondary truncate flex-1">{deal.nextAction}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })()}
    </>
  );
}
