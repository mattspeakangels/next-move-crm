import { Building2 } from 'lucide-react';
import { ContactSegment, CustomerType, ContactStatus } from '../../types';
import { allSectors, sectorLabel } from '../../lib/sectors';
import { ContactsModel } from './useContactsView';

export function ContactMainFields({ v }: { v: ContactsModel }) {
  const { groups, customSectors, editingContact, setEditingContact } = v;
  return (
    <>
      <section>
        <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2"><Building2 size={16}/> 1. Dati Anagrafici</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface dark:bg-surface p-6 rounded-panel shadow-sm">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Ragione Sociale *</label>
            <input type="text" style={{ textTransform: 'uppercase' }} className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.company || ''} onChange={e => setEditingContact({...editingContact, company: e.target.value.toUpperCase()})} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Tipologia</label>
            <select className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none" value={editingContact?.segment === 'dealer' ? 'dealer' : 'end-user'} onChange={e => setEditingContact({...editingContact, segment: e.target.value as ContactSegment, customerType: e.target.value as CustomerType})}>
              <option value="end-user">End User (Utilizzatore Finale)</option>
              <option value="dealer">Dealer (Rivenditore)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Status CRM</label>
            <select className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none" value={editingContact?.status || 'potenziale'} onChange={e => setEditingContact({...editingContact, status: e.target.value as ContactStatus})}>
              <option value="potenziale">Potenziale</option>
              <option value="cliente">Cliente Attivo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Gruppo strategico</label>
            <select className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none" value={editingContact?.groupId || ''} onChange={e => setEditingContact({...editingContact, groupId: e.target.value || undefined})}>
              <option value="">— Nessun gruppo —</option>
              {Object.values(groups).sort((a, b) => a.nome.localeCompare(b.nome, 'it')).map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Settore di Riferimento</label>
            <select className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none" value={editingContact?.sector || ''} onChange={e => setEditingContact({...editingContact, sector: e.target.value})}>
              <option value="">— Seleziona settore —</option>
              {allSectors(customSectors).map(s => (
                <option key={s} value={s}>{sectorLabel(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Partita IVA</label>
            <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all font-mono" placeholder="es. 01234567890" value={editingContact?.vatNumber || ''} onChange={e => setEditingContact({...editingContact, vatNumber: e.target.value})} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Telefono Gen.</label>
            <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Email Gen.</label>
            <input type="email" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Sito Web</label>
            <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" placeholder="es. www.azienda.it" value={editingContact?.website || ''} onChange={e => setEditingContact({...editingContact, website: e.target.value})} />
          </div>

          <div className="md:col-span-2 grid grid-cols-12 gap-2 mt-2">
            <div className="col-span-12 md:col-span-6">
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Indirizzo</label>
              <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.address || ''} onChange={e => setEditingContact({...editingContact, address: e.target.value})} />
            </div>
            <div className="col-span-4 md:col-span-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">CAP</label>
              <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.zipCode || ''} onChange={e => setEditingContact({...editingContact, zipCode: e.target.value})} />
            </div>
            <div className="col-span-5 md:col-span-3">
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Città</label>
              <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.city || ''} onChange={e => setEditingContact({...editingContact, city: e.target.value})} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Prov.</label>
              <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.province || ''} onChange={e => setEditingContact({...editingContact, province: e.target.value})} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
