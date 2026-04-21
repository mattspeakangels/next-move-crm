import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Zap, Plus, X } from 'lucide-react';

export const OnboardingView: React.FC = () => {
  const { setProfile, updateTarget } = useStore();
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
    setProfile({ 
      name, role, company, 
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

    setTimeout(() => {
        window.location.replace('/'); 
    }, 500);
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="flex justify-center mb-6">
          <Zap size={48} className="text-indigo-600 fill-indigo-600" />
        </div>
        
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-900">Benvenuto</h2>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tuo Nome" className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-600" />
            <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Tuo Ruolo (es. Venditore)" className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-600" />
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Tua Azienda" className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-600" />
            <button disabled={!name || !company} onClick={() => setStep(2)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50">Continua</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">Cosa vendi?</h2>
            <div className="flex gap-2">
              <input type="text" value={newProduct} onChange={e => setNewProduct(e.target.value)} placeholder="Prodotto..." className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-600" />
              <button onClick={handleAddProduct} className="p-4 bg-indigo-600 text-white rounded-xl"><Plus size={20}/></button>
            </div>
            <div className="flex flex-wrap gap-2 py-2">
              {products.map(p => (
                <span key={p} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  {p} <X size={14} className="cursor-pointer" onClick={() => setProducts(products.filter(item => item !== p))}/>
                </span>
              ))}
            </div>
            <button disabled={products.length === 0} onClick={() => setStep(3)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50">Ultimo step</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <h2 className="text-xl font-bold">Obiettivo Mensile</h2>
            <div className="text-4xl font-black text-indigo-600">€ {parseInt(target).toLocaleString('it-IT')}</div>
            <input type="range" min="10000" max="1000000" step="10000" value={target} onChange={e => setTarget(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            <button onClick={handleComplete} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl hover:scale-[1.02] transition-transform">CONFIGURA CRM</button>
          </div>
        )}
      </div>
    </div>
  );
};
