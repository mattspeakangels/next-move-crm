import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Package, Trash2, X, Upload } from 'lucide-react';
import { Product } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const ProductsView: React.FC = () => {
  const { products, addProduct, removeProduct } = useStore();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    code: '',
    description: '',
    category: '',
    price: 0,
    sizes: '',
    discount: 0
  });

  const handleSave = () => {
    if (!newProduct.code || !newProduct.description) {
      showToast('Codice e Descrizione sono obbligatori', 'error');
      return;
    }
    const product: Product = {
      id: `prod_${Date.now()}`,
      code: newProduct.code,
      description: newProduct.description,
      category: newProduct.category || 'Generale',
      price: Number(newProduct.price) || 0,
      sizes: newProduct.sizes || '',
      discount: Number(newProduct.discount) || 0,
    };
    
    addProduct(product);
    setShowModal(false);
    setNewProduct({ code: '', description: '', category: '', price: 0, sizes: '', discount: 0 });
    showToast('Articolo aggiunto', 'success');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      let addedCount = 0;

      // Partiamo da 1 per saltare l'intestazione del CSV
      // Ordine atteso colonne: codice, descrizione, categoria, prezzo, taglie, sconto
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Supporto per separatori con virgola o punto e virgola
        const separator = line.includes(';') ? ';' : ',';
        const values = line.split(separator);
        
        const code = values[0];
        const description = values[1];
        
        if (code && description) {
          addProduct({
            id: `prod_${Date.now()}_${i}`,
            code: code.trim(),
            description: description.trim(),
            category: values[2]?.trim() || 'Generale',
            price: parseFloat(values[3]) || 0,
            sizes: values[4]?.trim() || '',
            discount: parseFloat(values[5]) || 0
          });
          addedCount++;
        }
      }
      showToast(`${addedCount} articoli importati da CSV`, 'success');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Catalogo</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Gestione Articoli e Listino</p>
        </div>
        <div className="flex gap-3">
          {/* Input nascosto per il caricamento file */}
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white dark:bg-gray-800 text-indigo-600 border-2 border-indigo-100 dark:border-indigo-900/30 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all"
          >
            <Upload size={20} /> Importa CSV
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"
          >
            <Plus size={20} /> Aggiungi
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {Object.values(products).length > 0 ? (
          Object.values(products).map((product: Product) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700 flex justify-between items-center hover:border-indigo-100 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Package size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase">{product.code}</span>
                    <h3 className="font-black dark:text-white uppercase text-sm">{product.description}</h3>
                  </div>
                  <div className="flex gap-3 mt-1">
                    {product.sizes && <span className="text-[10px] text-gray-400 font-bold">TAGLIE: {product.sizes}</span>}
                    {product.discount > 0 && <span className="text-[10px] text-red-500 font-bold">SCONTO: {product.discount}%</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-black dark:text-white">€ {product.price.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{product.category}</p>
                </div>
                <button 
                  onClick={() => removeProduct(product.id)}
                  className="text-red-400 hover:text-red-600 p-2 transition-colors bg-red-50 dark:bg-red-900/20 rounded-xl"
                  title="Elimina articolo"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
            <Package size={48} className="mx-auto mb-4 text-gray-200 dark:text-gray-600" />
            <p className="text-gray-400 font-bold uppercase tracking-widest">Il catalogo è vuoto</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-white">Nuovo Articolo</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600 transition-colors"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Codice</label>
                <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors" value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Descrizione</label>
                <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Categoria</label>
                <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors" placeholder="Es. Abbigliamento, Accessori..." value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Prezzo (€)</label>
                  <input type="number" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Sconto (%)</label>
                  <input type="number" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors" value={newProduct.discount} onChange={e => setNewProduct({...newProduct, discount: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Taglie (es: S, M, L, XL)</label>
                <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors" value={newProduct.sizes} onChange={e => setNewProduct({...newProduct, sizes: e.target.value})} />
              </div>
              <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 hover:bg-indigo-700 transition-all">
                Salva nel Catalogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
