/** Bozza del cliente nella scheda: i campi si compilano man mano (l'id c'è sempre). */
export type ContactDraft = Partial<Contact>;
import { apiAuthHeaders } from '../../lib/apiAuth';
import { showNotice, confirmAction } from '../ui/Feedback';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from '../../lib/spreadsheet';
import { useStore } from '../../store/useStore';
import { Contact, ContactSegment } from '../../types';
import { matchSearch, sortByRelevance } from '../../utils/search';
import { ContactsViewProps } from '../../views/ContactsView';
import { classifySegment, parseCSVContacts } from '../../lib/contactsCsv';

// Stato, filtri, importazione e azioni della vista Clienti.
export function useContactsView({ initialSearch = '', onClearFilter, selectedContactId, onClearSelectedContact, onNewOfferForContact }: ContactsViewProps) {
  const { contacts, addContact, updateContact, deleteContact, deleteAllContacts, addContactsBatch, bulkUpdateSegments, deals, activities, groups, customSectors } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailContact, setDetailContact] = useState<ContactDraft | null>(null);
  const [editingContact, setEditingContact] = useState<ContactDraft | null>(null);
  const [addDealForContact, setAddDealForContact] = useState<string | null>(null);
  const [pendingDeleteAll, setPendingDeleteAll] = useState(false);
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'clienti' | 'prospect'>('clienti');
  const [topFilter, setTopFilter] = useState<'dealer' | 'end-user' | null>(null);
  const [subFilter, setSubFilter] = useState<'industria' | 'edilizia' | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [sortBy, setSortBy] = useState<'nome' | 'data' | 'citta' | 'interazione'>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Debounce ricerca — evita filter su ogni keystroke con 9k+ contatti
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setVisibleCount(50); }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Badge counts — memoizzati per evitare iterazione completa ad ogni render
  const clientiCount  = useMemo(() => Object.values(contacts).filter(c => c.status === 'cliente').length,   [contacts]);
  const prospectCount = useMemo(() => Object.values(contacts).filter(c => c.status === 'potenziale').length, [contacts]);

  // Data dell'ultima interazione (attività) per contatto — usata per l'ordinamento "Ultima interazione"
  const lastActivityByContact = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of Object.values(activities)) {
      if (!a.contactId) continue;
      if (!map[a.contactId] || a.date > map[a.contactId]) map[a.contactId] = a.date;
    }
    return map;
  }, [activities]);

  // Lista filtrata completa — memoizzata
  const filteredList = useMemo(() => {
    const statusFilter = activeTab === 'prospect' ? 'potenziale' : 'cliente';
    return Object.values(contacts)
      .filter(c => c.status === statusFilter)
      .filter(c => {
        if (!topFilter) return true;
        if (topFilter === 'dealer') return c.segment === 'dealer';
        if (!subFilter) return c.segment === 'end-user' || c.segment === 'industria' || c.segment === 'edilizia';
        return c.segment === subFilter;
      })
      .filter(c => matchSearch(debouncedSearch, [
        c.company, c.contactName, c.city, c.province, c.email, c.phone, c.vatNumber, c.address,
      ]))
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'data') return ((a.createdAt || 0) - (b.createdAt || 0)) * dir;
        if (sortBy === 'citta') return (a.city || '').localeCompare(b.city || '', 'it', { sensitivity: 'base' }) * dir;
        if (sortBy === 'interazione') return ((lastActivityByContact[a.id] || 0) - (lastActivityByContact[b.id] || 0)) * dir;
        return (a.company || a.contactName || '').localeCompare(b.company || b.contactName || '', 'it', { sensitivity: 'base' }) * dir;
      });
  }, [contacts, activeTab, topFilter, subFilter, debouncedSearch, sortBy, sortDir, lastActivityByContact]);

  // Mentre si sta cercando, anteponi i risultati più rilevanti (nome/azienda che iniziano
  // per il termine cercato) a parità di criterio di ordinamento scelto dall'utente.
  const rankedFilteredList = useMemo(
    () => sortByRelevance(debouncedSearch, filteredList, c => [c.company, c.contactName]),
    [filteredList, debouncedSearch]
  );

  // Reset paginazione quando cambia lista
  useEffect(() => { setVisibleCount(50); }, [filteredList]);
  const fileInputRefProspect = useRef<HTMLInputElement>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);


  const handleGeocode = async () => {
    if (!editingContact) return;
    setGeoLoading(true);
    setGeoStatus('idle');
    try {
      const params = new URLSearchParams();
      if (editingContact.city) params.set('city', editingContact.city);
      if (editingContact.province) params.set('province', editingContact.province);
      if (editingContact.address) params.set('address', editingContact.address);
      const res = await fetch(`/api/geocode?${params}`, { headers: await apiAuthHeaders() });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const jitter = () => (Math.random() - 0.5) * 0.004;
        const lat = parseFloat(data[0].lat) + jitter();
        const lng = parseFloat(data[0].lon) + jitter();
        setEditingContact((prev) => ({ ...prev, lat, lng }));
        if (editingContact.id && contacts[editingContact.id]) updateContact(editingContact.id, { lat, lng });
        setGeoStatus('ok');
      } else {
        setGeoStatus('error');
      }
    } catch {
      setGeoStatus('error');
    } finally {
      setGeoLoading(false);
    }
  };

  const openDetail = (contact?: ContactDraft) => {
    setGeoStatus('idle');
    if (contact) {
      setDetailContact(contact);
      setEditingContact(contact);
    } else {
      const newContact: ContactDraft = {
        id: `c_${Date.now()}`,
        company: '',
        customerType: 'end-user',
        status: 'potenziale',
        stakeholders: [],
        intelligence: { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' }
      };
      setDetailContact(newContact);
      setEditingContact(newContact);
    }
  };

  useEffect(() => {
    if (selectedContactId && contacts[selectedContactId]) {
      openDetail(contacts[selectedContactId]);
      onClearSelectedContact?.();
    }
  }, [selectedContactId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, status: 'potenziale' | 'cliente' = 'potenziale') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    console.log('📥 FILE CARICATO:', file.name, file.size, 'bytes', isExcel ? '(Excel)' : '(CSV)');
    const reader = new FileReader();
    const processText = (text: string) => {
      console.log('📄 CSV TEXT (first 500 chars):', text.substring(0, 500));
      const newContacts = parseCSVContacts(text, status);
      console.log('✅ CONTATTI PARSATI:', newContacts.length);
      console.log('📋 SAMPLE CONTATTI:', newContacts.slice(0, 3).map(c => ({
        company: c.company,
        address: c.address,
        city: c.city,
        phone: c.phone,
        status: c.status
      })));
      if (newContacts.length > 0) {
        addContactsBatch(newContacts);
        console.log('✨ CONTATTI AGGIUNTI NELLO STORE (mantenuti i precedenti)');
      } else {
        console.warn('⚠️ NESSUN CONTATTO PARSATO!');
      }
      if (fileInputRef.current)         fileInputRef.current.value = '';
      if (fileInputRefProspect.current) fileInputRefProspect.current.value = '';
    };
    if (isExcel) {
      reader.onload = (event) => {
        const wb = XLSX.read(event.target?.result, { type: 'array' });
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
        processText(csv);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => processText(event.target?.result as string);
      reader.readAsText(file);
    }
  };

  const recheckDealerClassification = async () => {
    const updates: Record<string, ContactSegment> = {};
    Object.values(contacts).forEach(c => {
      if (c.segment === 'dealer') return;
      const suggested = classifySegment(c.sector || '', c.company || '');
      if (suggested === 'dealer') updates[c.id] = 'dealer';
    });
    const count = Object.keys(updates).length;
    if (count === 0) {
      showNotice('Nessun contatto da correggere: in base a settore e ragione sociale, nessuno risulta erroneamente classificato come End User.');
      return;
    }
    const names = Object.keys(updates).slice(0, 8).map(id => contacts[id].company).join(', ');
    const preview = count > 8 ? `${names}, +${count - 8} altri` : names;
    if (!await confirmAction(`Trovati ${count} contatti classificati come End User che, in base a settore/ragione sociale, sembrano in realtà Dealer:\n\n${preview}\n\nCorreggerli ora in Dealer?`)) return;
    bulkUpdateSegments(updates);
    showNotice(`${count} contatti aggiornati a Dealer.`);
  };

  const geocodeOne = async (city?: string, province?: string, address?: string) => {
    if (!city && !province && !address) return null;
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (province) params.set('province', province);
      if (address) params.set('address', address);
      const res = await fetch(`/api/geocode?${params}`, { headers: await apiAuthHeaders() });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const jitter = () => (Math.random() - 0.5) * 0.004;
        return { lat: parseFloat(data[0].lat) + jitter(), lng: parseFloat(data[0].lon) + jitter() };
      }
    } catch {
      // geocoding silenzioso — non blocca il salvataggio
    }
    return null;
  };

  const handleSave = async () => {
    if (!editingContact?.company) return showNotice('Inserisci la ragione sociale');
    // L'id c'è sempre: la bozza nasce da un contatto esistente o con id generato
    const draftId = editingContact.id ?? '';
    const isNew = !contacts[draftId];
    if (isNew) {
      addContact(editingContact as Contact);
    } else {
      updateContact(draftId, editingContact);
    }
    setDetailContact(null);

    const contactId = draftId;
    const updates: Partial<Contact> = {};

    // Geocodifica automatica solo per nuovi clienti con almeno città o indirizzo
    if (isNew && (editingContact.city || editingContact.province || editingContact.address)) {
      const coords = await geocodeOne(editingContact.city, editingContact.province, editingContact.address);
      if (coords) Object.assign(updates, coords);
    }

    // Geocodifica automatica delle sedi aggiuntive che non hanno ancora coordinate
    const locations = editingContact.locations || [];
    const toGeocode = locations.filter(l => (l.city || l.province || l.address) && !(l.lat && l.lng));
    if (toGeocode.length > 0) {
      const geocoded = await Promise.all(
        toGeocode.map(l => geocodeOne(l.city, l.province, l.address))
      );
      const newLocations = locations.map(l => {
        const idx = toGeocode.findIndex(t => t.id === l.id);
        if (idx === -1) return l;
        const coords = geocoded[idx];
        return coords ? { ...l, ...coords } : l;
      });
      updates.locations = newLocations;
    }

    if (Object.keys(updates).length > 0) {
      updateContact(contactId, updates);
    }
  };
  return { initialSearch, onClearFilter, selectedContactId, onClearSelectedContact, onNewOfferForContact, contacts, addContact, updateContact, deleteContact, deleteAllContacts, addContactsBatch, bulkUpdateSegments, deals, activities, groups, customSectors, searchTerm, setSearchTerm, fileInputRef, detailContact, setDetailContact, editingContact, setEditingContact, addDealForContact, setAddDealForContact, pendingDeleteAll, setPendingDeleteAll, historyContact, setHistoryContact, showImportModal, setShowImportModal, activeTab, setActiveTab, topFilter, setTopFilter, subFilter, setSubFilter, visibleCount, setVisibleCount, sortBy, setSortBy, sortDir, setSortDir, debouncedSearch, setDebouncedSearch, clientiCount, prospectCount, lastActivityByContact, filteredList, rankedFilteredList, fileInputRefProspect, geoLoading, setGeoLoading, geoStatus, setGeoStatus, confirmDeleteId, setConfirmDeleteId, handleGeocode, openDetail, handleFileUpload, recheckDealerClassification, geocodeOne, handleSave };
}

export type ContactsModel = ReturnType<typeof useContactsView>;
