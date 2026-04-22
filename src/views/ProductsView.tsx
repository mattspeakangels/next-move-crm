import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Package, Trash2, X } from 'lucide-react';
import { Product } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const ProductsView: React.FC = () => {
  const { products, addProduct, removeProduct } = useStore() as any;
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
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
      code: newProduct.code!,
      description: newProduct.description!,
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

  // Dichiariamo esplicitamente il tipo per evitare l'errore TS18046 (unknown)
  const productsList = Object.values(products || {}) as Product[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Catalogo</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Gestione Articoli e Listino</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} /> Aggiungi Articolo
        </button>
      </div>

      <div className="grid gap-4">
        {productsList.length > 0 ? (
          productsList.map((product) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700 flex justify-between items-center">
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
                {removeProduct && (
                  <button 
                    onClick={() => removeProduct(product.id)}
                    className="text-red-400 hover:text-red-600 p-2 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <Package size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-400 font-bold uppercase tracking-widest">Il catalogo è vuoto</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-white">Nuovo Articolo</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-gray-400"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Codice</label>
                <input 
                  type="text"
                  className="
