import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useStoricoStore } from '../store/storicoStore';
import { User, Target, Package, Trash2, Moon, Sun, Plus, X, ShieldCheck, Users, LogOut, Mail, KeyRound, Sparkles, ChevronDown } from 'lucide-react';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../lib/authContext';
import { DeviceAuthModal } from '../components/ui/DeviceAuthModal';
import Anthropic from '@anthropic-ai/sdk';
import { PuliziaTerritorio } from '../components/settings/PuliziaTerritorio';

type PendingAction = { title: string; description: string; execute: () => void } | null;

export const SettingsView: React.FC = () => {
  const { profile, theme, contacts, products, salesTransactions, updateProfile, toggleTheme, deleteAllContacts, clearSalesTransactions, clearProducts, discountApprovalThreshold, setDiscountApprovalThreshold, updateContact } = useStore();
  const storicoClienti = useStoricoStore(s => s.clienti);
  const resetStorico = useStoricoStore(s => s.reset);
  const { showToast } = useToast();
  const { user, logout, resetPassword } = useAuth();
  const [newProduct, setNewProduct] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // ── Arricchimento settori NACE ───────────────────────────────────────────────
  const SECTORS = ['Edilizia','Industria','Trasporti e logistica','Servizi','Agricoltura','Energia e utilities','Altro'] as const;
  const [claudeApiKey, setClaudeApiKey] = useState(() => localStorage.getItem('claude_api_key') || '');
  const [naceEnriching, setNaceEnriching] = useState(false);
  const [naceProgress, setNaceProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [naceShowList, setNaceShowList] = useState(false);

  const noSectorContacts = Object.values(contacts).filter(c => !c.sector || c.sector.trim() === '');

  const saveApiKey = (key: string) => {
    setClaudeApiKey(key);
    localStorage.setItem('claude_api_key', key);
  };

  const enrichWithClaude = useCallback(async () => {
    if (!claudeApiKey.trim()) { showToast('Inserisci prima la Claude API Key', 'error'); return; }
    const targets = Object.values(contacts).filter(c => !c.sector || c.sector.trim() === '');
    if (!targets.length) { showToast('Nessun contatto senza settore', 'info'); return; }

    setNaceEnriching(true);
    setNaceProgress({ done: 0, total: targets.length, errors: 0 });

    let client: Anthropic;
    try {
      client = new Anthropic({ apiKey: claudeApiKey.trim(), dangerouslyAllowBrowser: true });
    } catch (e) {
      showToast('API Key non valida', 'error');
      setNaceEnriching(false);
      return;
    }

    const BATCH = 10;
    let totalErrors = 0;
    let totalUpdated = 0;

    for (let i = 0; i < targets.length; i += BATCH) {
      const batch = targets.slice(i, i + BATCH);
      const lines = batch.map((c, j) => `${j + 1}. "${c.company}" – ${c.city || ''} (${c.province || ''})`).join('\n');
      try {
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: 'Rispondi SOLO con un array JSON valido, senza testo aggiuntivo.',
          messages: [{ role: 'user', content:
            `Classifica ciascuna azienda in UNO di questi settori: ${SECTORS.join(', ')}.\n\nAziende:\n${lines}\n\nRispondi con un array JSON: [{"index":1,"sector":"Edilizia"}, ...]\nUsa indici 1-based come nell'elenco.` }],
        });
        const text = (msg.content[0] as { text: string }).text.trim();
        const match = text.match(/\[[\s\S]*?\]/);
        if (match) {
          const results: { index: number; sector: string }[] = JSON.parse(match[0]);
          results.forEach(r => {
            if (!r || typeof r.index !== 'number') return;
            const c = batch[r.index - 1];
            if (!c) return;
            const sec = SECTORS.includes(r.sector as typeof SECTORS[number]) ? r.sector : 'Altro';
            updateContact(c.id, { sector: sec, updatedAt: Date.now() });
            totalUpdated++;
          });
        } else {
          // fallback: assegna 'Altro' a tutti
          batch.forEach(c => { updateContact(c.id, { sector: 'Altro', updatedAt: Date.now() }); totalUpdated++; });
        }
      } catch (err) {
        totalErrors++;
        // fallback: assegna 'Altro' così escono dalla lista "senza settore"
        batch.forEach(c => { updateContact(c.id, { sector: 'Altro', updatedAt: Date.now() }); totalUpdated++; });
      }
      setNaceProgress({ done: Math.min(i + BATCH, targets.length), total: targets.length, errors: totalErrors });
      await new Promise(r => setTimeout(r, 200));
    }

    setNaceEnriching(false);
    if (totalErrors > 0) {
      showToast(`Completato: ${totalUpdated} aggiornati, ${totalErrors} batch con errore API (assegnato "Altro")`, 'info');
    } else {
      showToast(`Arricchimento completato: ${totalUpdated} prospect classificati`, 'success');
    }
  }, [claudeApiKey, contacts, updateContact, showToast]);

  const requireAuth = (title: string, description: string, execute: () => void) => {
    setPendingAction({ title, description, execute });
  };

  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com') ?? false;

  const handleResetPassword = async () => {
    if (!user?.email) return;
    await resetPassword(user.email);
    setResetSent(true);
    setTimeout(() => setResetSent(false), 5000);
  };

  const handleLogout = async () => {
    if (!window.confirm('Vuoi uscire dal tuo account?')) return;
    setLoggingOut(true);
    await logout();
  };

  if (!profile) return null;

  const handleAddProduct = () => {
    if (newProduct.trim() && !profile.customProducts.includes(newProduct.trim())) {
      updateProfile({ customProducts: [...profile.customProducts, newProduct.trim()] });
      setNewProduct('');
      showToast('Prodotto aggiunto');
    }
  };

  const removeProduct = (p: string) => {
    updateProfile({ customProducts: profile.customProducts.filter(item => item !== p) });
    showToast('Prodotto rimosso');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Account */}
      {user && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <h3 className="font-bold flex items-center gap-2"><ShieldCheck size={18} className="text-indigo-600"/> Account</h3>

          {/* Avatar + nome */}
          <div className="flex items-center gap-4">
            {user.photoURL
              ? <img src={user.photoURL} alt="avatar" className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-100" />
              : <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <User size={24} className="text-indigo-500" />
                </div>
            }
            <div>
              <p className="font-black text-gray-900 dark:text-white text-sm">{user.displayName || 'Utente'}</p>
              <p className="text-xs text-gray-400 mt-0.5">Accesso tramite {isGoogleUser ? 'Google' : 'Email'}</p>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl px-4 py-3">
              <Mail size={15} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
                <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl px-4 py-3">
              <KeyRound size={15} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password</p>
                {isGoogleUser
                  ? <p className="text-sm text-gray-500">Gestita da Google — modifica su myaccount.google.com</p>
                  : <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-sm font-bold text-gray-800 dark:text-white tracking-widest">••••••••</p>
                      <button
                        onClick={handleResetPassword}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        {resetSent ? 'Email inviata ✓' : 'Cambia password'}
                      </button>
                    </div>
                }
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-black text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            <LogOut size={16} />
            {loggingOut ? 'Uscita in corso…' : 'Esci dal profilo'}
          </button>
        </div>
      )}

      {/* Profilo */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><User size={18} className="text-indigo-600"/> Profilo Personale</h3>
        <div className="space-y-4">
          <input 
            type="text" 
            value={profile.name} 
            onChange={e => updateProfile({ name: e.target.value })}
            placeholder="Tuo Nome"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent"
          />
          <input 
            type="text" 
            value={profile.company} 
            onChange={e => updateProfile({ company: e.target.value })}
            placeholder="Azienda"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent"
          />
        </div>
      </div>

      {/* Target */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-indigo-600"/> Obiettivo Mensile</h3>
        <input 
          type="number" 
          value={profile.defaultMonthlyTarget} 
          onChange={e => updateProfile({ defaultMonthlyTarget: parseInt(e.target.value) })}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent font-bold text-indigo-600"
        />
      </div>

      {/* Prodotti Custom */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Package size={18} className="text-indigo-600"/> Gestione Prodotti</h3>
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newProduct} 
            onChange={e => setNewProduct(e.target.value)}
            placeholder="Aggiungi nuovo prodotto..."
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-sm"
          />
          <button onClick={handleAddProduct} className="p-2 bg-indigo-600 text-white rounded-xl"><Plus size={20}/></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.customProducts.map(p => (
            <span key={p} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-xs font-bold">
              {p} <X size={14} className="cursor-pointer text-red-500" onClick={() => removeProduct(p)}/>
            </span>
          ))}
        </div>
      </div>

      {/* Approvazione Sconti */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-indigo-600"/> Soglia Approvazione Sconti</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Le offerte con sconto medio superiore a questa soglia vengono marcate come "Richiede approvazione".
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={discountApprovalThreshold}
            onChange={e => setDiscountApprovalThreshold(parseInt(e.target.value))}
            className="flex-1 accent-indigo-600"
          />
          <span className="text-xl font-black text-indigo-600 min-w-[50px] text-right">{discountApprovalThreshold}%</span>
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
          <span>0%</span><span>10%</span><span>20%</span><span>30%</span><span>40%</span><span>50%</span><span>60%</span>
        </div>
      </div>

      {/* Preferenze */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Tema Scuro
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Gestione Rubrica */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-1 flex items-center gap-2"><Users size={18} className="text-indigo-600"/> Gestione Rubrica</h3>
        <p className="text-xs text-gray-400 mb-4">
          Attualmente hai <span className="font-black text-indigo-600">{Object.keys(contacts).length}</span> contatti in rubrica
          {' '}(<span className="text-green-600 font-bold">{Object.values(contacts).filter(c => c.status === 'cliente').length} clienti</span>
          {' '}· <span className="text-blue-600 font-bold">{Object.values(contacts).filter(c => c.status === 'potenziale').length} prospect</span>)
        </p>
        <button
          onClick={() => requireAuth(
            'Svuota tutti i contatti',
            `Stai per eliminare ${Object.keys(contacts).length} contatti. Questa azione non è reversibile e cancellerà anche deal, offerte e attività associate.`,
            () => { deleteAllContacts(); showToast('Rubrica svuotata', 'success'); }
          )}
          className="flex items-center gap-2 text-red-500 text-sm font-bold border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={15} /> Svuota tutti i contatti
        </button>
      </div>

      {/* Svuota Catalogo Prodotti */}
      <div className="p-6 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Catalogo Prodotti</p>
        <p className="text-xs text-gray-400 mb-3">
          Attualmente hai <span className="font-black text-indigo-600">{Object.keys(products).length}</span> articoli nel catalogo
        </p>
        <button
          onClick={() => requireAuth(
            'Svuota catalogo prodotti',
            `Stai per eliminare ${Object.keys(products).length} articoli dal catalogo. Questa azione non è reversibile.`,
            () => { clearProducts(); showToast('Catalogo prodotti svuotato', 'success'); }
          )}
          className="flex items-center gap-2 text-red-500 text-sm font-bold border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={15} /> Svuota catalogo prodotti
        </button>
      </div>

      {/* Reset Storico Vendite */}
      <div className="p-6 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Storico Vendite</p>
        <button
          onClick={() => {
            const nTransazioni = Object.keys(salesTransactions).length;
            const nStorico = storicoClienti.length;
            requireAuth(
              'Svuota storico vendite',
              `Stai per eliminare ${nStorico} clienti da Excel e ${nTransazioni} transazioni. I clienti CRM e i deal non verranno toccati.`,
              () => { clearSalesTransactions(); resetStorico(); showToast('Storico vendite svuotato', 'success'); }
            );
          }}
          className="flex items-center gap-2 text-orange-500 text-sm font-bold border border-orange-200 dark:border-orange-800 px-4 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        >
          <Trash2 size={15} /> Svuota storico vendite
        </button>
      </div>

      {/* Azioni Pericolose */}
      <div className="p-6 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => requireAuth(
            'Resetta tutti i dati',
            'Verranno eliminati TUTTI i dati: clienti, deal, offerte, attività, prodotti, storico. Il tuo account rimarrà attivo ma il database sarà completamente azzerato.',
            () => { localStorage.removeItem('next-move-storage'); window.location.reload(); }
          )}
          className="flex items-center gap-2 text-red-500 text-sm font-bold opacity-70 hover:opacity-100 transition-opacity"
        >
          <Trash2 size={16} /> Resetta tutti i dati dell'App
        </button>
      </div>

      {/* ── Pulizia Territorio ─────────────────────────────────────────── */}
      <PuliziaTerritorio />

      {/* ── Arricchimento Settori NACE ─────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arricchimento Settori NACE</h3>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${noSectorContacts.length > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
            {noSectorContacts.length} senza settore
          </span>
        </div>

        {noSectorContacts.length === 0 ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">✅ Tutti i prospect hanno un settore assegnato.</p>
        ) : (
          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Claude API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={claudeApiKey}
                  onChange={e => saveApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white font-mono"
                />
                <button
                  onClick={enrichWithClaude}
                  disabled={naceEnriching || !claudeApiKey}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <Sparkles size={14} />
                  {naceEnriching ? `${naceProgress.done}/${naceProgress.total}${naceProgress.errors > 0 ? ` (${naceProgress.errors} err)` : ''}` : 'Classifica con Claude'}
                </button>
              </div>
              {naceEnriching && (
                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${naceProgress.total ? (naceProgress.done / naceProgress.total) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>

            {/* Lista contatti senza settore */}
            <div>
              <button
                onClick={() => setNaceShowList(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform ${naceShowList ? 'rotate-180' : ''}`} />
                {naceShowList ? 'Nascondi lista' : `Mostra ${noSectorContacts.length} contatti`}
              </button>

              {naceShowList && (
                <div className="mt-2 max-h-64 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-50 dark:divide-gray-700">
                  {noSectorContacts.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{c.company}</p>
                        <p className="text-[10px] text-gray-400">{c.city} {c.province ? `(${c.province})` : ''}</p>
                      </div>
                      <select
                        value={c.sector || ''}
                        onChange={e => updateContact(c.id, { sector: e.target.value, updatedAt: Date.now() })}
                        className="ml-3 text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">— scegli —</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {pendingAction && (
        <DeviceAuthModal
          title={pendingAction.title}
          description={pendingAction.description}
          onConfirm={() => { pendingAction.execute(); setPendingAction(null); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
};
