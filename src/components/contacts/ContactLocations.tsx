import type { Contact } from '../../types';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import { ContactsModel } from './useContactsView';

export function ContactLocations({ v }: { v: ContactsModel }) {
  const { editingContact, setEditingContact } = v;
  return (
    <>
      {(() => {
        const locations: NonNullable<Contact['locations']> = editingContact?.locations || [];
        const inputCls = "w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all text-sm";
        const labelCls = "text-xs font-semibold text-muted uppercase tracking-normal block mb-1";

        const updateLocation = (id: string, field: string, val: string) => {
          setEditingContact({ ...editingContact, locations: locations.map(l => l.id === id ? { ...l, [field]: val } : l) });
        };
        const addLocation = () => {
          setEditingContact({ ...editingContact, locations: [...locations, { id: `loc_${Date.now()}`, label: '', address: '', city: '', zipCode: '', province: '', country: 'IT' }] });
        };
        const removeLocation = (id: string) => {
          setEditingContact({ ...editingContact, locations: locations.filter(l => l.id !== id) });
        };

        return (
          <section>
            <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2">
              <MapPin size={16}/> Sedi Aggiuntive
            </h3>
            <div className="space-y-4">
              {locations.map(l => (
                <div key={l.id} className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm border-2 border-line dark:border-line relative">
                  <button onClick={() => removeLocation(l.id)} className="absolute top-4 right-4 p-1.5 rounded-lg text-danger hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <div className="mb-3">
                    <label className={labelCls}>Nome Sede</label>
                    <input type="text" className={inputCls} placeholder="es. Negozio Milano, Filiale Nord…" value={l.label || ''} onChange={e => updateLocation(l.id, 'label', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 md:col-span-6">
                      <label className={labelCls}>Indirizzo</label>
                      <input type="text" className={inputCls} value={l.address || ''} onChange={e => updateLocation(l.id, 'address', e.target.value)} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className={labelCls}>CAP</label>
                      <input type="text" className={inputCls} value={l.zipCode || ''} onChange={e => updateLocation(l.id, 'zipCode', e.target.value)} />
                    </div>
                    <div className="col-span-5 md:col-span-3">
                      <label className={labelCls}>Città</label>
                      <input type="text" className={inputCls} value={l.city || ''} onChange={e => updateLocation(l.id, 'city', e.target.value)} />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                      <label className={labelCls}>Prov.</label>
                      <input type="text" className={inputCls} value={l.province || ''} onChange={e => updateLocation(l.id, 'province', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addLocation} className="w-full py-3 rounded-panel border-2 border-dashed border-line dark:border-line text-xs font-semibold text-muted uppercase tracking-normal hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
                <Plus size={14} /> Aggiungi Sede
              </button>
            </div>
          </section>
        );
      })()}
    </>
  );
}
