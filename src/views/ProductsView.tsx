import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Search, PackagePlus, Upload, X, Package } from 'lucide-react';
import { Product } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const ProductsView: React.FC = () => {
  const { products, addProduct, addProductsBatch } = useStore();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({ code: '', name: '', category: '', price: 0, description: '' });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newProducts: Product[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(/[;,]/);
        if (values.length >= 3) {
          newProducts.push({
            id: `p_${Date.now()}_${i}`,
            code: values[0]?.trim() || '',
            name: values[1]?.trim() || '',
            category: values[2]?.trim() || '',
            price: parseFloat(values[3]?.replace(',', '.') || '0'),
            description: values[4]?.trim() || ''
          });
        }
      }
      addProductsBatch(newProducts);
      showToast(`${newProducts.length} prodotti caricati!`, 'success');
    };
    reader.readAsText(file);
  };

  const filteredProducts = Object.values(products).filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black dark:text-white">Catalogo Prodotti</h1>
        <div className="flex gap-2">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-white dark:bg-gray-800 text-indigo-600 border-2 border-indigo-100 px-4 py-3 rounded-2xl font-bold flex items-center gap-2"><Upload size={20} /> Importa CSV</button>
          <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200"><PackagePlus size={20} /> Aggiungi</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Cerca per nome o codice..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm outline-none" />
      </div>

      <div className="grid gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-50 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400"><Package size={24}/></div>
              <div>
                <h3 className="font-black dark:text-white">{product.name}</h3>
                <div className="flex gap-3 mt-1 text-xs font-bold uppercase tracking-wider">
                  <span className="text-indigo-600">Cod: {product.code}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-lg dark:text-white">€ {product.price.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
      
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">Nuovo Prodotto</h2>
                <button onClick={() => setShowModal(false)}><X size={24} className="text-gray-400"/></button>
              </div>
              <div className="space-y-4">
                <input placeholder="Codice" className="w-full border-2 border-gray-100 rounded-2xl p-3" onChange={e => setFormData({...formData, code: e.target.value})} />
                <input placeholder="Nome" className="w-full border-2 border-gray-100 rounded-2xl p-3" onChange={e => setFormData({...formData, name: e.target.value})} />
                <input type="number" placeholder="Prezzo" className="w-full border-2 border-gray-100 rounded-2xl p-3" onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                <button 
                  onClick={() => {
                    addProduct({ ...formData, id: `p_${Date.now()}` });
                    setShowModal(false);
                    showToast('Aggiunto!', 'success');
                  }}
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase"
                >
                  Salva
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
