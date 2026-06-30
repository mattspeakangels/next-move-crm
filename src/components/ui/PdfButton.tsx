import React, { useState } from 'react';
import { openOfferPdf } from '../../lib/uploadPdf';

interface Props {
  pdfUrl: string;
  pdfName?: string;
  className?: string;
  children: React.ReactNode;
  triggerPrint?: boolean;
}

export const PdfButton: React.FC<Props> = ({ pdfUrl, pdfName, className, children, triggerPrint = false }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // openOfferPdf opens the window synchronously inside, before any await
      await openOfferPdf(pdfUrl, triggerPrint);
    } catch (err: any) {
      alert(err?.message ?? 'Errore apertura PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={pdfName || 'PDF offerta'}
      className={className}
    >
      {loading
        ? <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
        : children}
    </button>
  );
};
