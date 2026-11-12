import { CustomerRequestsSection } from './CustomerRequestsSection';
import { CustomerCommunications } from './CustomerCommunications';
import { DealCommercialDetails } from './DealCommercialDetails';
import { DealOperationalFlow } from './DealOperationalFlow';
import { InlinePhotoSection } from './InlinePhotoSection';
import { InlineBiSection } from './InlineBiSection';
import { InlineOfferSection } from './InlineOfferSection';
import { ProfilingCollapsible } from './ProfilingCollapsible';
import { InlineProgrammaSection } from './InlineProgrammaSection';
import { ContactsModel } from './useContactsView';
import { ContactOpenDeals } from './ContactOpenDeals';
import { ContactInteractionScore } from './ContactInteractionScore';
import { ContactStakeholders } from './ContactStakeholders';
import { ContactLocations } from './ContactLocations';
import { ContactMainFields } from './ContactMainFields';
import { ContactDetailHeader } from './ContactDetailHeader';

export function ContactDetail({ v }: { v: ContactsModel }) {
  const { contacts, deals, editingContact } = v;
  return (
    <>
      <div className="min-h-screen -m-4 md:-m-8 bg-canvas dark:bg-canvas">
        {/* Sticky header */}
        <ContactDetailHeader v={v} />

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">

          {/* SEZIONE 1 */}
          <ContactMainFields v={v} />

          {/* SEZIONE 1A-BIS - Sedi Aggiuntive */}
          <ContactLocations v={v} />

          {/* SEZIONE 1B - Persone di Riferimento */}
          <ContactStakeholders v={v} />

          {editingContact?.id && contacts[editingContact.id] && <CustomerCommunications contactId={editingContact.id} />}
          {editingContact?.id && contacts[editingContact.id] && <CustomerRequestsSection contactId={editingContact.id} />}

          {/* SEZIONE 2 - Profilazione Blaklader (collassabile) */}
          {editingContact?.id && contacts[editingContact.id] && (
            <ProfilingCollapsible contact={contacts[editingContact.id]} />
          )}

          {/* SEZIONE 5 - Programma Attività (solo in modifica) */}
          {editingContact?.id && contacts[editingContact.id] && (
            <InlineProgrammaSection contactId={editingContact.id} />
          )}

          {/* SEZIONE 5B - Customer Interaction Score (solo in modifica) */}
          <ContactInteractionScore v={v} />

          {/* SEZIONE 6 - Deal Aperti (solo in modifica) */}
          <ContactOpenDeals v={v} />

          {editingContact?.id && contacts[editingContact.id] && Object.values(deals).filter(deal => deal.contactId === editingContact.id).map(deal => <div key={deal.id}><DealCommercialDetails deal={deal} /><DealOperationalFlow deal={deal} /></div>)}

          {/* SEZIONE 7 - Offerte (solo in modifica) */}
          {editingContact?.id && contacts[editingContact.id] && (
            <InlineOfferSection contactId={editingContact.id} />
          )}

          {/* SEZIONE 8 - Business Intelligence (solo in modifica) */}
          {editingContact?.id && contacts[editingContact.id] && (
            <InlineBiSection contactId={editingContact.id} />
          )}

          {/* SEZIONE 9 - Foto Punto Vendita / Assortimento (solo in modifica) */}
          {editingContact?.id && contacts[editingContact.id] && (
            <InlinePhotoSection contactId={editingContact.id} />
          )}

        </div>
      </div>
    </>
  );
}
