import type { ContactPhoto } from '../../types';
import { asCaught } from '../../utils/errors';
import { showNotice } from '../ui/Feedback';
import { DialogFrame } from '../ui/DialogFrame';
import React, { useState, useRef } from 'react';
import { X, Trash2, Upload, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { fmtFileSize } from './InlineBiSection';

// Foto del cliente: caricamento, anteprima ed eliminazione.
export const InlinePhotoSection: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { contacts, updateContact } = useStore();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ photo: any; fullUrl: string | null; loading: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const contact = contacts[contactId];
  const photos = (contact?.photos ?? []).slice().sort((a, b) => b.uploadedAt - a.uploadedAt);

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { uploadContactPhoto } = await import('../../lib/uploadPhoto');
      for (const file of files) {
        const photo = await uploadContactPhoto(contactId, file);
        const current = contacts[contactId]?.photos ?? [];
        updateContact(contactId, { photos: [...current, photo] });
      }
    } catch (caught) {
      const err = asCaught(caught);
      showNotice(err?.message ?? 'Errore caricamento foto');
    } finally {
      setUploading(false);
    }
  };

  const openViewer = async (photo: ContactPhoto) => {
    setViewer({ photo, fullUrl: null, loading: true });
    try {
      const { getContactPhotoFullDataUrl } = await import('../../lib/uploadPhoto');
      const fullUrl = await getContactPhotoFullDataUrl(photo);
      setViewer({ photo, fullUrl, loading: false });
    } catch (caught) {
      const err = asCaught(caught);
      showNotice(err?.message ?? 'Errore apertura foto');
      setViewer(null);
    }
  };

  const handleDelete = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    setDeletingId(photoId);
    try {
      const { deleteContactPhoto } = await import('../../lib/uploadPhoto');
      await deleteContactPhoto(photo);
      const current = contacts[contactId]?.photos ?? [];
      updateContact(contactId, { photos: current.filter(p => p.id !== photoId) });
      setViewer(null);
    } catch (caught) {
      const err = asCaught(caught);
      showNotice(err?.message ?? 'Errore eliminazione foto');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesChange} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted   flex items-center gap-2">
          <ImageIcon size={16} /> 9. Foto Punto Vendita / Assortimento
          <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{photos.length}</span>
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warning-soft dark:bg-warning-soft text-warning font-semibold text-xs uppercase tracking-wide hover:bg-warning-soft transition-colors disabled:opacity-40"
        >
          {uploading
            ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-warning border-t-transparent rounded-full" /> Caricamento...</>
            : <><Upload size={12} /> Carica Foto</>
          }
        </button>
      </div>

      {photos.length === 0 && (
        <p className="text-xs text-muted font-bold italic">Nessuna foto caricata per questo cliente</p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {photos.map(photo => (
            <button
              key={photo.id}
              onClick={() => openViewer(photo)}
              className="relative aspect-square rounded-panel overflow-hidden bg-raised dark:bg-surface shadow-sm group"
            >
              <img src={photo.thumb} alt={photo.name} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-foreground text-xs font-semibold">
                {fmtFileSize(photo.size)}
              </span>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn size={18} className="text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewer && (
        <DialogFrame className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-surface dark:bg-surface rounded-panel overflow-hidden shadow-panel">
              <div className="aspect-square bg-raised dark:bg-canvas flex items-center justify-center">
                {viewer.loading
                  ? <span className="animate-spin inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                  : <img src={viewer.fullUrl ?? viewer.photo.thumb} alt={viewer.photo.name} className="w-full h-full object-contain" />
                }
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <p className="text-xs text-muted font-bold truncate">
                  {new Date(viewer.photo.uploadedAt).toLocaleDateString('it-IT')} · {fmtFileSize(viewer.photo.size)}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(viewer.photo.id)}
                    disabled={deletingId === viewer.photo.id}
                    className="p-1.5 rounded-lg bg-canvas dark:bg-raised text-muted hover:bg-danger-soft hover:text-danger transition-colors disabled:opacity-40"
                  >
                    {deletingId === viewer.photo.id
                      ? <span className="animate-spin inline-block w-3 h-3 border-2 border-danger border-t-transparent rounded-full" />
                      : <Trash2 size={12} />
                    }
                  </button>
                  <button onClick={() => setViewer(null)} className="p-1.5 rounded-lg bg-canvas dark:bg-raised text-muted hover:bg-raised transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogFrame>
      )}
    </section>
  );
};
