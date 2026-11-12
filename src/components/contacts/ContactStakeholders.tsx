import type { Stakeholder } from '../../types';
import { Plus, Users, Trash2 } from 'lucide-react';
import { ContactsModel } from './useContactsView';

export function ContactStakeholders({ v }: { v: ContactsModel }) {
  const { editingContact, setEditingContact } = v;
  return (
    <>
      {(() => {
        const allSh: Stakeholder[] = editingContact?.stakeholders || [];
        const titolare = allSh.find((s) => s.role === 'Titolare');
        const altre = allSh.filter((s) => s.role !== 'Titolare');

        const setTitolare = (field: string, val: string) => {
          if (titolare) {
            setEditingContact({ ...editingContact, stakeholders: allSh.map((s) => s.role === 'Titolare' ? { ...s, [field]: val } : s) });
          } else {
            setEditingContact({ ...editingContact, stakeholders: [{ id: `sh_titolare_${Date.now()}`, role: 'Titolare', firstName: '', lastName: '', email: '', phone: '', [field]: val }, ...altre] });
          }
        };

        const updateAltra = (id: string, field: string, val: string) => {
          setEditingContact({ ...editingContact, stakeholders: allSh.map((s) => s.id === id ? { ...s, [field]: val } : s) });
        };

        const addAltra = () => {
          const titItem = titolare ? [titolare] : [];
          setEditingContact({ ...editingContact, stakeholders: [...titItem, ...altre, { id: `sh_${Date.now()}`, role: '', firstName: '', lastName: '', email: '', phone: '' }] });
        };

        const removeAltra = (id: string) => {
          setEditingContact({ ...editingContact, stakeholders: allSh.filter((s) => s.id !== id) });
        };

        const inputCls = "w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all text-sm";
        const labelCls = "text-xs font-semibold text-muted uppercase tracking-normal block mb-1";

        return (
          <section>
            <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2">
              <Users size={16}/> 1b. Persone di Riferimento
            </h3>
            <div className="space-y-4">
              {/* Titolare */}
              <div className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm border-2 border-accent dark:border-accent/40">
                <p className="text-xs font-semibold text-accent uppercase tracking-normal mb-3">Titolare</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nome</label>
                    <input type="text" className={inputCls} placeholder="Nome" value={titolare?.firstName || ''} onChange={e => setTitolare('firstName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Cognome</label>
                    <input type="text" className={inputCls} placeholder="Cognome" value={titolare?.lastName || ''} onChange={e => setTitolare('lastName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" className={inputCls} placeholder="email@azienda.it" value={titolare?.email || ''} onChange={e => setTitolare('email', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Cellulare</label>
                    <input type="tel" className={inputCls} placeholder="+39 333 000 0000" value={titolare?.phone || ''} onChange={e => setTitolare('phone', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Altre figure */}
              {altre.map((s) => (
                <div key={s.id} className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm border-2 border-line dark:border-line relative">
                  <button onClick={() => removeAltra(s.id)} className="absolute top-4 right-4 p-1.5 rounded-lg text-danger hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-3">Figura di Riferimento</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Nome</label>
                      <input type="text" className={inputCls} placeholder="Nome" value={s.firstName || ''} onChange={e => updateAltra(s.id, 'firstName', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Cognome</label>
                      <input type="text" className={inputCls} placeholder="Cognome" value={s.lastName || ''} onChange={e => updateAltra(s.id, 'lastName', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" className={inputCls} placeholder="email@azienda.it" value={s.email || ''} onChange={e => updateAltra(s.id, 'email', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Cellulare</label>
                      <input type="tel" className={inputCls} placeholder="+39 333 000 0000" value={s.phone || ''} onChange={e => updateAltra(s.id, 'phone', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Ruolo in Azienda</label>
                      <input type="text" className={inputCls} placeholder="es. Responsabile Acquisti, Ufficio Tecnico…" value={s.role || ''} onChange={e => updateAltra(s.id, 'role', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addAltra} className="w-full py-3 rounded-panel border-2 border-dashed border-line dark:border-line text-xs font-semibold text-muted uppercase tracking-normal hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
                <Plus size={14} /> Aggiungi Figura di Riferimento
              </button>
            </div>
          </section>
        );
      })()}
    </>
  );
}
