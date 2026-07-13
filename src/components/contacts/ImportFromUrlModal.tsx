import React, { useState } from 'react';
import { X, Link, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { scrapeContactFromUrl, ScrapedContact } from '../../utils/scrapeContact';

interface ImportFromUrlModalProps {
  onClose: () => void;
  onImport: (data: ScrapedContact) => void;
}

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold dark:text-white outline-none focus:border-indigo-400"
    />
  </div>
);

export const ImportFromUrlModal: React.FC<ImportFromUrlModalProps> = ({ onClose, onImport }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ScrapedContact | null>(null);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      let cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;
      const result = await scrapeContactFromUrl(cleanUrl);
      setData(result);
    } catch (e: any) {
      setError('Impossibile raggiungere il sito. Prova con un URL diverso o compila manualmente.');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: keyof ScrapedContact) => (v: string) =>
    setData(prev => prev ? { ...prev, [field]: v } : prev);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Link size={18} className="text-indigo-600" />
            <h2 className="text-base font-black dark:text-white">Importa da URL</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* URL input */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Sito web / URL azienda
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetch()}
                placeholder="es. https://www.azienda.it"
                autoFocus
                className="flex-1 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400"
              />
              <button
                onClick={handleFetch}
                disabled={loading || !url.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-sm disabled:opacity-50 hover:bg-indigo-700 transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Analizza'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 font-bold">
              Funziona con siti aziendali standard. Non compatibile con LinkedIn o Google Maps.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 font-bold">{error}</p>
            </div>
          )}

          {/* Results */}
          {data && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle size={14} />
                <span className="text-xs font-black uppercase tracking-wide">Dati estratti — verifica e correggi</span>
              </div>

              <Field label="Ragione Sociale *" value={data.company} onChange={update('company')} placeholder="Nome azienda" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefono" value={data.phone} onChange={update('phone')} placeholder="+39 ..." />
                <Field label="Email" value={data.email} onChange={update('email')} placeholder="info@..." />
              </div>
              <Field label="Sito Web" value={data.website} onChange={update('website')} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="P.IVA" value={data.vatNumber} onChange={update('vatNumber')} placeholder="IT12345678901" />
                <Field label="Settore" value={data.sector} onChange={update('sector')} placeholder="es. Edilizia" />
              </div>
              <Field label="Indirizzo" value={data.address} onChange={update('address')} />
              <div className="grid grid-cols-3 gap-2">
                <Field label="Città" value={data.city} onChange={update('city')} />
                <Field label="CAP" value={data.zipCode} onChange={update('zipCode')} />
                <Field label="Prov." value={data.province} onChange={update('province')} placeholder="MI" />
              </div>
              {data.notes && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Note (descrizione)</label>
                  <textarea
                    value={data.notes}
                    onChange={e => update('notes')(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold dark:text-white outline-none focus:border-indigo-400 resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-gray-500 font-black text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={() => { onImport(data); onClose(); }}
              disabled={!data.company.trim()}
              className="flex-2 flex-grow py-2.5 px-6 rounded-xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Crea contatto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
