import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Zap, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OnboardingView: React.FC = () => {
  const { setProfile, updateTarget } = useStore(); // Usiamo setProfile invece di updateProfile
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [target, setTarget] = useState('400000');
  const [products, setProducts] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState('');

  const handleAddProduct = () => {
    if (newProduct.trim() && !products.includes(newProduct.trim())) {
      setProducts([...products, newProduct.trim()]);
      setNewProduct('');
    }
  };

  const handleComplete = () => {
    // Creiamo il profilo da zero
    setProfile({ 
      name, 
      role, 
      company, 
      defaultMonthlyTarget: parseInt(target, 10),
      customProducts: products 
    });
    
    const now = new Date();
    const targetId = `${now.getFullYear()}-${now.getMonth()}`;
    updateTarget(targetId, {
      id: targetId,
      month: now.getMonth(),
      year: now.getFullYear(),
      targetValue: parseInt(target, 10),
      closedValue: 0
    });

    // Piccolo trucco: forziamo la navigazione e un refresh leggero
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Zap size={32} className="fill-white" />
          </div>
        </div>
        
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center dark:text-white">Benvenuto</h2>
            <p className="text-center text-gray-500 text-sm">Inserisci i tuoi dati professionali.</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tuo Nome" className="w-full border rounded-xl px-4 py-3 bg-transparent dark:text-white outline-none focus:border-indigo-500" />
            <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Tuo Ruolo (es. Sales)" className="w-full border rounded-xl px-4 py-3 bg-transparent dark:text-white outline-none focus:border-indigo-500" />
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Tua Azienda" className="w-full border rounded-xl px-4 py-3 bg-transparent dark:text-white outline-none focus:border-indigo-500" />
            <button disabled={!name || !company} onClick={() => setStep(2)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all">Continua</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center dark:text-white">Cosa vendi?</h2>
            <div className="flex gap-2">
              <input type="text" value={newProduct} onChange={e => setNewProduct(e.target.value)} placeholder="Aggiungi prodotto..." className="flex-1 border rounded-xl px-4 py-3 bg-transparent dark:text-white outline-none focus:border-indigo-500" />
              <button onClick={handleAddProduct} className="p-3 bg-indigo-600 text-white rounded-xl"><Plus size={24}/></button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {products.map(p => (
                <span key={p} className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full text-xs font-bold">
                  {p} <X size={14} className="cursor-pointer" onClick={() => setProducts(products.filter(item => item !== p))}/>
                </span>
              ))}
              {products.length === 0 && <p className="text-center w-full text-xs text-gray-400 py-4 italic">Aggiungi almeno un prodotto o categoria.</p>}
            </div>
            <button disabled={products.length === 0} onClick={() => setStep(3)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all">Continua</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold dark:text-white">Obiettivo Mensile</h2>
            <p className="text-gray-500 text-sm">Qual è il tuo target di vendita?</p>
            <div className="py-4">
              <span className="text-3xl font-extrabold text-indigo-600">€ {parseInt(target).toLocaleString('it-IT')}</span>
            </div>
            <input type="range" min="10000" max="1000000" step="10000" value={target} onChange={e => setTarget(e.target.value)} className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(2)} className="px-4 py-3 text-gray-500 font-bold hover:text-indigo-600">Indietro</button>
              <button onClick={handleComplete} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all">Inizia ora</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
