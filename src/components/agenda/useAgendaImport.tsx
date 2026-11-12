import { apiAuthHeaders } from '../../lib/apiAuth';
import { useState, useRef } from 'react';
import { TYPE_LABELS } from './agendaShared';
import { AgendaFormModel } from './useAgendaForm';

// Agenda: importazione da Outlook (PST) ed esportazione .ics.
export function useAgendaImport(prev: AgendaFormModel) {
  const { activities, addActivity, contacts, showToast, today, allActivities } = prev;
  // ── PST Import da Outlook ──
  const pstInputRef = useRef<HTMLInputElement>(null);
  const [pstLoading, setPstLoading] = useState(false);
  const [pstEvents, setPstEvents] = useState<any[]>([]);
  const [pstSelected, setPstSelected] = useState<Set<number>>(new Set());
  const [pstModalOpen, setPstModalOpen] = useState(false);
  const [pstContactOverrides, setPstContactOverrides] = useState<Record<number, string>>({});

  const inferActivityType = (subject: string, location: string): string => {
    const s = (subject + ' ' + location).toLowerCase();
    if (s.includes('teams') || s.includes('meet.google') || s.includes('zoom') || s.includes('call') || s.includes('remota')) return 'call-remota';
    if (s.includes('formazione') || s.includes('corso') || s.includes('training') || s.includes('eloomi')) return 'formazione';
    if (s.includes('demo')) return 'demo';
    if (s.includes('sopralluogo')) return 'sopralluogo';
    return 'visita';
  };

  const matchContact = (subject: string): string => {
    const s = subject.toLowerCase();
    // Estrai la parte prima del trattino (es. "ECSA - Blåkläder" → "ecsa")
    const beforeDash = s.split(/\s*[-–]\s*/)[0].trim();
    const allContacts = Object.values(contacts);
    // Match esatto o parziale
    const exact = allContacts.find((c: any) =>
      c.company.toLowerCase() === beforeDash || s.includes(c.company.toLowerCase())
    );
    if (exact) return (exact as any).id;
    // Match fuzzy: ogni parola del subject lunga >3 char
    const words = beforeDash.split(/\s+/).filter(w => w.length > 3);
    for (const w of words) {
      const hit = allContacts.find((c: any) => c.company.toLowerCase().includes(w));
      if (hit) return (hit as any).id;
    }
    return '';
  };

  const bufToBase64 = (buf: ArrayBuffer): string => {
    const bytes = new Uint8Array(buf);
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as unknown as number[]));
    }
    return btoa(binary);
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    // Metodo 1: arrayBuffer diretto
    try {
      return bufToBase64(await file.arrayBuffer());
    } catch { /* prova metodo 2 */ }

    // Metodo 2: blob URL (aggira restrizioni cloud sync su Safari/Chrome)
    const blobUrl = URL.createObjectURL(file);
    try {
      const res = await fetch(blobUrl);
      return bufToBase64(await res.arrayBuffer());
    } catch { /* prova metodo 3 */ } finally {
      URL.revokeObjectURL(blobUrl);
    }

    // Metodo 3: FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        try { resolve(bufToBase64(reader.result as ArrayBuffer)); } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error(
        'File non leggibile. Verifica in Finder che il file non abbia un\'icona ☁️ (iCloud non scaricato): clic destro → "Scarica ora", poi riprova.'
      ));
    });
  };

  const handlePSTUpload = async (file: File) => {
    setPstLoading(true);
    try {
      const base64 = await fileToBase64(file);

      const res = await fetch('/api/parse-pst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await apiAuthHeaders()) },
        body: JSON.stringify({ data: base64 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Errore parsing PST');

      const enriched = (json.events as any[]).map((ev: any, i: number) => ({
        ...ev,
        _idx: i,
        _contactId: matchContact(ev.subject),
        _type: inferActivityType(ev.subject, ev.location),
        _duplicate: ev.start
          ? Object.values(activities).some((a: any) =>
              Math.abs(a.date - new Date(ev.start).getTime()) < 60000 &&
              a.notes?.includes(ev.subject)
            )
          : false,
      }));

      // Pre-seleziona tutto tranne duplicati e senza data
      const sel = new Set<number>(
        enriched.filter((e: any) => e.start && !e._duplicate).map((e: any) => e._idx)
      );
      // Inizializza override con auto-match
      const overrides: Record<number, string> = {};
      enriched.forEach((e: any) => { overrides[e._idx] = e._contactId || ''; });
      setPstEvents(enriched);
      setPstSelected(sel);
      setPstContactOverrides(overrides);
      setPstModalOpen(true);
    } catch (err: any) {
      showToast(`Errore: ${err.message}`, 'error');
    } finally {
      setPstLoading(false);
    }
  };

  const handlePSTImport = () => {
    let imported = 0;
    pstEvents.forEach((ev: any) => {
      if (!pstSelected.has(ev._idx) || !ev.start) return;
      const ts = new Date(ev.start).getTime();
      addActivity({
        id: `pst_${Date.now()}_${ev._idx}`,
        contactId: pstContactOverrides[ev._idx] ?? ev._contactId ?? '',
        type: ev._type as any,
        date: ts,
        outcome: 'da-fare',
        notes: [ev.subject, ev.location ? `📍 ${ev.location}` : '', ev.body].filter(Boolean).join('\n').trim(),
        createdAt: Date.now(),
      });
      imported++;
    });
    setPstModalOpen(false);
    setPstEvents([]);
    showToast(`${imported} appuntamenti importati da Outlook`, 'success');
  };

  // ── ICS bulk export (all upcoming activities) ──
  const handleExportICS = () => {
    const upcoming = allActivities
      .filter(a => a.date >= today.getTime())
      .sort((a, b) => a.date - b.date);

    if (upcoming.length === 0) { showToast('Nessun appuntamento futuro da esportare', 'error'); return; }

    const fmtICS = (ms: number) => {
      const d = new Date(ms);
      return (
        d.getUTCFullYear() +
        String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0') + 'T' +
        String(d.getUTCHours()).padStart(2, '0') +
        String(d.getUTCMinutes()).padStart(2, '0') + '00Z'
      );
    };

    const events = upcoming
      .map(a => {
        const contact = contacts[a.contactId];
        const summary = `${TYPE_LABELS[a.type]} - ${contact?.company || 'Cliente'}`;
        const location = contact?.address ? `${contact.address}, ${contact.city || ''}`.trim().replace(/,$/, '') : '';
        const lines = [
          'BEGIN:VEVENT',
          `UID:${a.id}@nextmove-crm`,
          `DTSTART:${fmtICS(a.date)}`,
          `DTEND:${fmtICS(a.date + 60 * 60 * 1000)}`,
          `SUMMARY:${summary.replace(/[\\;,]/g, c => '\\' + c)}`,
          a.notes   ? `DESCRIPTION:${a.notes.replace(/\n/g, '\\n').replace(/[\\;,]/g, c => '\\' + c)}` : null,
          location  ? `LOCATION:${location.replace(/[\\;,]/g, c => '\\' + c)}` : null,
          'STATUS:CONFIRMED',
          'END:VEVENT',
        ].filter(Boolean) as string[];
        return lines.join('\r\n');
      })
      .join('\r\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SYRIO//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nextmove-agenda.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`${upcoming.length} appuntamenti esportati (.ics)`, 'success');
  };
  return { ...prev, pstInputRef, pstLoading, setPstLoading, pstEvents, setPstEvents, pstSelected, setPstSelected, pstModalOpen, setPstModalOpen, pstContactOverrides, setPstContactOverrides, inferActivityType, matchContact, bufToBase64, fileToBase64, handlePSTUpload, handlePSTImport, handleExportICS };
}

export type AgendaImportModel = ReturnType<typeof useAgendaImport>;
