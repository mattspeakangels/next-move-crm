import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ProductLine } from '../types';
import productsData from '../data/products.json';

export const useInitializeProducts = () => {
  const { products, addProduct } = useStore();

  useEffect(() => {
    const productCount = Object.keys(products).length;
    if (productCount === 0 && productsData.length > 0) {
      productsData.forEach((p: any) => {
        addProduct({
          id: p.id,
          code: p.code,
          name: p.name || p.description,
          description: p.description,
          category: p.category,
          price: p.price || 0,
          discount: p.discount || 0,
          colors: p.colors,
          line: (p.line || 'X1900') as ProductLine
        });
      });
      console.log(`✅ ${productsData.length} prodotti caricati nel catalogo`);
    }
  }, []);
};
