import { DialogFrame } from '../components/ui/DialogFrame';
import React from 'react';
import { Trash2 } from 'lucide-react';
import { AddDealModal } from '../components/deals/AddDealModal';
import { ImportFromUrlModal } from '../components/contacts/ImportFromUrlModal';
import { DeviceAuthModal } from '../components/ui/DeviceAuthModal';
import { ContactHistoryView } from './ContactHistoryView';
import { useContactsView } from '../components/contacts/useContactsView';
import { ContactDetail } from '../components/contacts/ContactDetail';
import { ContactListPanel } from '../components/contacts/ContactListPanel';

export interface ContactsViewProps {
  initialSearch?: string;
  onClearFilter?: () => void;
  selectedContactId?: string | null;
  onClearSelectedContact?: () => void;
  onNewOfferForContact?: (contactId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = (props) => {
  const v = useContactsView(props);
  const { onNewOfferForContact, contacts, deleteContact, deleteAllContacts, detailContact, setDetailContact, setEditingContact, addDealForContact, setAddDealForContact, pendingDeleteAll, setPendingDeleteAll, historyContact, setHistoryContact, showImportModal, setShowImportModal, confirmDeleteId, setConfirmDeleteId } = v;
  // ── Storico Clienti sub-page ──
  if (historyContact) {
    return (
      <ContactHistoryView
        contact={historyContact}
        onBack={() => setHistoryContact(null)}
        onNewOfferForContact={onNewOfferForContact}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">

      {detailContact !== null ? (
        <ContactDetail v={v} />
      ) : (
        // LIST VIEW
        <ContactListPanel v={v} />
      )}

      {/* AddDeal Modal */}
      {addDealForContact && (
        <AddDealModal
          initialContactId={addDealForContact}
          onClose={() => setAddDealForContact(null)}
        />
      )}

      {/* DeviceAuth — Pulisci DB */}
      {pendingDeleteAll && (
        <DeviceAuthModal
          title="Elimina tutti i contatti"
          description={`Stai per eliminare ${Object.values(contacts).length} contatti dal database. Questa azione non è reversibile.`}
          onConfirm={() => { deleteAllContacts(); setPendingDeleteAll(false); }}
          onCancel={() => setPendingDeleteAll(false)}
        />
      )}

      {/* Modal conferma eliminazione singolo contatto */}
      {confirmDeleteId && (() => {
        const c = contacts[confirmDeleteId];
        return (
          <DialogFrame className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface dark:bg-surface rounded-panel p-6 shadow-panel max-w-sm w-full mx-4">
              <div className="flex items-center gap-3 mb-3">
                <Trash2 size={20} className="text-danger shrink-0" />
                <h4 className="font-semibold text-foreground dark:text-foreground">Elimina contatto</h4>
              </div>
              <p className="text-sm text-secondary dark:text-muted mb-1">
                Stai per eliminare <strong>{c?.company}</strong>.
              </p>
              <p className="text-xs text-danger mb-5">Questa azione non è reversibile.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2 border border-line dark:border-line rounded-md text-sm font-bold text-secondary dark:text-muted hover:bg-canvas dark:hover:bg-raised"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    deleteContact(confirmDeleteId);
                    setConfirmDeleteId(null);
                    setEditingContact(null);
                  }}
                  className="flex-1 py-2 bg-danger hover:bg-danger text-status-foreground text-sm font-bold rounded-md"
                >
                  Sì, elimina
                </button>
              </div>
            </div>
          </DialogFrame>
        );
      })()}

      {/* Import da URL */}
      {showImportModal && (
        <ImportFromUrlModal
          onClose={() => setShowImportModal(false)}
          onImport={scraped => {
            const now = Date.now();
            const newContact = {
              id: `c_${now}`,
              company: scraped.company,
              customerType: 'end-user',
              status: 'potenziale',
              contactName: '',
              role: '',
              email: scraped.email,
              phone: scraped.phone,
              website: scraped.website,
              vatNumber: scraped.vatNumber,
              address: scraped.address,
              city: scraped.city,
              zipCode: scraped.zipCode,
              province: scraped.province,
              country: scraped.country || 'IT',
              sector: scraped.sector,
              notes: scraped.notes,
              region: '',
              stakeholders: [],
              intelligence: { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' },
              createdAt: now,
              updatedAt: now,
            };
            setDetailContact(newContact);
            setEditingContact(newContact);
          }}
        />
      )}

    </div>
  );
};
