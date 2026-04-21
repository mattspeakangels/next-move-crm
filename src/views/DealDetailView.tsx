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
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500"><ArrowLeft size={20}/> Torna indietro</button>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border dark:border-gray-700">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3 inline-block">
              {deal.stage.replace('-', ' ')}
            </span>
            <h1 className="text-3xl font-black dark:text-white">{contact.company}</h1>
            <p className="text-gray-500">Referente: {contact.contactName}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-indigo-600">€ {deal.value.toLocaleString()}</div>
            <div className="flex items-center gap-2 justify-end text-sm text-gray-400">
              <Target size={14}/> Probabilità: {deal.probability}%
            </div>
          </div>
        </div>

        {/* Sezione Offerta */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm"><Package size={20} className="text-indigo-600"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Riferimento Offerta</p>
                    <input 
                        type="text" 
                        value={offerRef} 
                        onChange={(e) => setOfferRef(e.target.value)}
                        onBlur={() => updateDeal(deal.id, { offerRef })}
                        placeholder="Inserisci numero offerta..."
                        className="bg-transparent border-none p-0 font-bold dark:text-white focus:ring-0 w-full"
                    />
                </div>
            </div>
        </div>

        {deal.stage !== 'chiuso-vinto' && deal.stage !== 'chiuso-perso' ? (
          <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setShowCloseModal('vinto')}
                className="flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all"
            >
                <Trophy size={20}/> VINTO
            </button>
            <button 
                onClick={() => setShowCloseModal('perso')}
                className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all"
            >
                <XCircle size={20}/> PERSO
            </button>
          </div>
        ) : (
          <div className={`p-6 rounded-2xl border-2 flex items-center gap-4 ${deal.stage === 'chiuso-vinto' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            {deal.stage === 'chiuso-vinto' ? <Trophy size={32}/> : <Ghost size={32}/>}
            <div>
                <p className="font-black text-xl">TRATTATIVA {deal.stage === 'chiuso-vinto' ? 'VINTA!' : 'PERSA'}</p>
                {deal.lostReason && <p className="text-sm">Motivo: <span className="font-bold uppercase">{deal.lostReason}</span> {deal.competitor && `• Competitor: ${deal.competitor}`}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Modal Chiusura */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-4 dark:text-white capitalize">Chiudi come {showCloseModal}</h3>
            
            {showCloseModal === 'perso' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Perché è andata male?</label>
                  <select 
                    value={lostReason} 
                    onChange={(e) => setLostReason(e.target.value as LostReason)}
                    className="w-full border-2 rounded-xl p-3 bg-transparent dark:text-white border-gray-100 dark:border-gray-700"
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
                    className="w-full border-2 rounded-xl p-3 bg-transparent dark:text-white border-gray-100 dark:border-gray-700"
                  />
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowCloseModal(null)} className="flex-1 py-4 font-bold text-gray-400">Annulla</button>
              <button 
                onClick={() => handleCloseDeal(showCloseModal === 'vinto')}
                className={`flex-1 py-4 rounded-2xl font-bold text-white ${showCloseModal === 'vinto' ? 'bg-green-600' : 'bg-red-600'}`}
              >
                Conferma Chiusura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
