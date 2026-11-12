import { asCaught } from '../../utils/errors';
import { showNotice } from '../ui/Feedback';
import React, { useState, useRef } from 'react';
import { Trash2, Upload, FileText, Download } from 'lucide-react';
import { useStore } from '../../store/useStore';

// Documenti BI del cliente: caricamento, download ed eliminazione.
export function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const InlineBiSection: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { contacts, updateContact } = useStore();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const contact = contacts[contactId];
  const docs = (contact?.biDocuments ?? []).slice().sort((a, b) => b.uploadedAt - a.uploadedAt);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { uploadBiDocument } = await import('../../lib/uploadBiDocument');
      const doc = await uploadBiDocument(contactId, file);
      const current = contacts[contactId]?.biDocuments ?? [];
      updateContact(contactId, { biDocuments: [...current, doc] });
    } catch (caught) {
      const err = asCaught(caught);
      showNotice(err?.message ?? 'Errore caricamento documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (docId: string) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    setDownloadingId(docId);
    try {
      const { downloadBiDocument } = await import('../../lib/uploadBiDocument');
      await downloadBiDocument(doc);
    } catch (caught) {
      const err = asCaught(caught);
      showNotice(err?.message ?? 'Errore download documento');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    setDeletingId(docId);
    try {
      const { deleteBiDocument } = await import('../../lib/uploadBiDocument');
      await deleteBiDocument(doc);
      const current = contacts[contactId]?.biDocuments ?? [];
      updateContact(contactId, { biDocuments: current.filter(d => d.id !== docId) });
    } catch (caught) {
      const err = asCaught(caught);
      showNotice(err?.message ?? 'Errore eliminazione documento');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFileChange} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted   flex items-center gap-2">
          <FileText size={16} /> 8. Business Intelligence
          <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{docs.length}</span>
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warning-soft dark:bg-warning-soft text-warning font-semibold text-xs uppercase tracking-wide hover:bg-warning-soft transition-colors disabled:opacity-40"
        >
          {uploading
            ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-warning border-t-transparent rounded-full" /> Caricamento...</>
            : <><Upload size={12} /> Carica Documento</>
          }
        </button>
      </div>

      {docs.length === 0 && (
        <p className="text-xs text-muted font-bold italic">Nessun documento caricato per questo cliente</p>
      )}

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="bg-surface dark:bg-surface rounded-panel p-3 flex items-center gap-3 shadow-sm">
              <FileText size={18} className="text-warning flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs dark:text-foreground truncate">{doc.name}</p>
                <p className="text-xs text-muted font-bold mt-0.5">
                  {new Date(doc.uploadedAt).toLocaleDateString('it-IT')} · {fmtFileSize(doc.size)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(doc.id)}
                disabled={downloadingId === doc.id}
                className="p-1.5 rounded-lg bg-warning-soft dark:bg-warning-soft text-warning hover:bg-warning-soft transition-colors disabled:opacity-40"
              >
                {downloadingId === doc.id
                  ? <span className="animate-spin inline-block w-3 h-3 border-2 border-warning border-t-transparent rounded-full" />
                  : <Download size={12} />
                }
              </button>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="p-1.5 rounded-lg bg-canvas dark:bg-raised text-muted hover:bg-danger-soft hover:text-danger transition-colors disabled:opacity-40"
              >
                {deletingId === doc.id
                  ? <span className="animate-spin inline-block w-3 h-3 border-2 border-danger border-t-transparent rounded-full" />
                  : <Trash2 size={12} />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
