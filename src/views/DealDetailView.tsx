import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Target, Package, XCircle, Trophy, Ghost } from 'lucide-react';
import { LostReason } from '../types';

export const DealDetailView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deals, contacts, updateDeal } = useStore();
  
  const deal = deals[id || ''];
  const contact = deal ? contacts[deal.contactId] : null;

  const [showCloseModal, setShowCloseModal] = useState<'vinto' | 'perso' | null>(null);
  const [lostReason, setLostReason] = useState<LostReason>('prezzo');
  const [competitor, setCompetitor] = useState('');
  const [offerRef, setOfferRef] = useState(deal?.offerRef || '');

  if (!deal || !contact) return <div className="p-8">Deal non trovato.</div>;

  const handleCloseDeal = (vinto: boolean) => {
    updateDeal(deal.id, {
      stage: vinto ? 'chiuso-vinto' : 'chiuso-perso',
      closedAt: Date.now(),
      lostReason: vinto ? undefined : lostReason,
      competitor: vinto ? competitor : competitor,
      offerRef: offerRef,
      updatedAt: Date.now()
    });
    setShowCloseModal(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-secondary"><ArrowLeft size={20}/> Torna indietro</button>

      <div className="bg-surface dark:bg-surface rounded-panel p-5 sm:p-8 shadow-sm border dark:border-line">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-normal text-accent bg-accent-soft px-3 py-1 rounded-full mb-3 inline-block">
              {deal.stage.replace('-', ' ')}
            </span>
            <h1 className="text-2xl sm:text-3xl  dark:text-foreground break-words">{contact.company}</h1>
            <p className="text-secondary">Referente: {contact.contactName}</p>
          </div>
          <div className="sm:text-right flex-shrink-0">
            <div className="text-2xl sm:text-3xl font-semibold text-accent">€ {deal.value.toLocaleString()}</div>
            <div className="flex items-center gap-2 sm:justify-end text-sm text-muted">
              <Target size={14}/> Probabilità: {deal.probability}%
            </div>
          </div>
        </div>

        {/* Sezione Offerta */}
        <div className="p-4 bg-canvas dark:bg-canvas/50 rounded-panel mb-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-surface dark:bg-surface rounded-lg shadow-sm"><Package size={20} className="text-accent"/></div>
                <div>
                    <p className="text-xs uppercase font-bold text-muted">Riferimento Offerta</p>
                    <input 
                        type="text" 
                        value={offerRef} 
                        onChange={(e) => setOfferRef(e.target.value)}
                        onBlur={() => updateDeal(deal.id, { offerRef })}
                        placeholder="Inserisci numero offerta..."
                        className="bg-transparent border-none p-0 font-bold dark:text-foreground focus:ring-0 w-full"
                    />
                </div>
            </div>
        </div>

        {deal.stage !== 'chiuso-vinto' && deal.stage !== 'chiuso-perso' ? (
          <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setShowCloseModal('vinto')}
                className="flex items-center justify-center gap-2 bg-success text-status-foreground py-4 rounded-panel font-bold shadow-panel shadow-green-200 dark:shadow-none hover:bg-success transition-all"
            >
                <Trophy size={20}/> VINTO
            </button>
            <button 
                onClick={() => setShowCloseModal('perso')}
                className="flex items-center justify-center gap-2 bg-danger-soft text-danger py-4 rounded-panel font-bold hover:bg-danger-soft transition-all"
            >
                <XCircle size={20}/> PERSO
            </button>
          </div>
        ) : (
          <div className={`p-6 rounded-panel border-2 flex items-center gap-4 ${deal.stage === 'chiuso-vinto' ? 'bg-success-soft border-success text-success' : 'bg-canvas border-line text-secondary'}`}>
            {deal.stage === 'chiuso-vinto' ? <Trophy size={32}/> : <Ghost size={32}/>}
            <div>
                <p className="font-semibold text-xl">TRATTATIVA {deal.stage === 'chiuso-vinto' ? 'VINTA!' : 'PERSA'}</p>
                {deal.lostReason && <p className="text-sm">Motivo: <span className="font-bold uppercase">{deal.lostReason}</span> {deal.competitor && `• Competitor: ${deal.competitor}`}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Modal Chiusura */}
      {showCloseModal && (
        <DialogFrame className="fixed inset-0 bg-canvas/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-surface w-full max-w-md rounded-panel p-8 shadow-panel">
            <h3 className="text-2xl font-semibold mb-4 dark:text-foreground capitalize">Chiudi come {showCloseModal}</h3>
            
            {showCloseModal === 'perso' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-2">Perché è andata male?</label>
                  <select 
                    value={lostReason} 
                    onChange={(e) => setLostReason(e.target.value as LostReason)}
                    className="w-full border-2 rounded-md p-3 bg-transparent dark:text-foreground border-line dark:border-line"
                  >
                    <option value="prezzo">Prezzo troppo alto</option>
                    <option value="competitor">Preso da Competitor</option>
                    <option value="progetto-annullato">Progetto annullato dal cliente</option>
                    <option value="cliente-finale-negativo">Il cliente del cliente non ha confermato</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                {lostReason === 'competitor' && (
                  <input 
                    type="text" 
                    placeholder="Quale competitor?" 
                    value={competitor}
                    onChange={(e) => setCompetitor(e.target.value)}
                    className="w-full border-2 rounded-md p-3 bg-transparent dark:text-foreground border-line dark:border-line"
                  />
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowCloseModal(null)} className="flex-1 py-4 font-bold text-muted">Annulla</button>
              <button 
                onClick={() => handleCloseDeal(showCloseModal === 'vinto')}
                className={`flex-1 py-4 rounded-panel font-bold text-status-foreground ${showCloseModal === 'vinto' ? 'bg-success' : 'bg-danger'}`}
              >
                Conferma Chiusura
              </button>
            </div>
          </div>
        </DialogFrame>
      )}
    </div>
  );
};
