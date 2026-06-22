import { useState, useCallback, useEffect } from 'react';
import { Contact, ContactSegment } from '../types';

export interface CatalogSuggestion {
  id: string;
  company: string;
  segment: ContactSegment;
  priority: 'alta' | 'media' | 'bassa';
  note: string;
  approved: boolean;
}

interface AICatalogState {
  suggestions: CatalogSuggestion[];
  processedIds: string[];
  progress: { done: number; total: number } | null;
  loading: boolean;
  error: string | null;
  rateLimitReset: number | null;
}

const STORAGE_KEY = 'nm-catalog-results';
const BATCH_SIZE = 40;

function loadFromStorage(): { suggestions: CatalogSuggestion[]; processedIds: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { suggestions: [], processedIds: [] };
    const parsed = JSON.parse(raw) as { suggestions: CatalogSuggestion[]; processedIds: string[] };
    return parsed;
  } catch {
    return { suggestions: [], processedIds: [] };
  }
}

function saveToStorage(suggestions: CatalogSuggestion[], processedIds: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ suggestions, processedIds }));
  } catch { /* storage full — ignore */ }
}

export function useAICatalog() {
  const [state, setState] = useState<AICatalogState>(() => {
    const saved = loadFromStorage();
    return {
      suggestions: saved.suggestions,
      processedIds: saved.processedIds,
      progress: null,
      loading: false,
      error: null,
      rateLimitReset: null,
    };
  });

  // Aggiorna storage quando cambiano suggerimenti
  useEffect(() => {
    saveToStorage(state.suggestions, state.processedIds);
  }, [state.suggestions, state.processedIds]);

  const run = useCallback(async (contacts: Contact[]) => {
    const token = import.meta.env.VITE_ADMIN_API_TOKEN as string;

    // Filtra contatti già processati
    const already = new Set(state.processedIds);
    const toProcess = contacts.filter(c => !already.has(c.id));

    if (toProcess.length === 0) return;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      rateLimitReset: null,
      progress: { done: 0, total: toProcess.length },
    }));

    let done = 0;
    const newSuggestions: CatalogSuggestion[] = [];
    const newProcessedIds: string[] = [];

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);

      try {
        const res = await fetch('/api/catalog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            contacts: batch.map(c => ({
              id: c.id,
              company: c.company,
              city: c.city || '',
              province: c.province || '',
              notes: c.notes || '',
            })),
          }),
        });

        if (res.status === 429) {
          const errData = await res.json().catch(() => ({})) as { resetAt?: number; error?: string };
          setState(prev => ({
            ...prev,
            loading: false,
            error: errData.error || 'Rate limit raggiunto',
            rateLimitReset: errData.resetAt ?? null,
            suggestions: [...prev.suggestions, ...newSuggestions],
            processedIds: [...prev.processedIds, ...newProcessedIds],
            progress: prev.progress ? { ...prev.progress, done } : null,
          }));
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const json = await res.json() as { results: Array<{ id: string; segment: ContactSegment; priority: 'alta' | 'media' | 'bassa'; note: string }> };

        const batchSuggestions: CatalogSuggestion[] = json.results.map(r => {
          const contact = batch.find(c => c.id === r.id);
          return {
            id: r.id,
            company: contact?.company ?? r.id,
            segment: r.segment,
            priority: r.priority,
            note: r.note,
            approved: true,
          };
        });

        newSuggestions.push(...batchSuggestions);
        newProcessedIds.push(...batch.map(c => c.id));
        done += batch.length;

        setState(prev => {
          const updatedSuggestions = [...prev.suggestions, ...batchSuggestions];
          const updatedIds = [...prev.processedIds, ...batch.map(c => c.id)];
          saveToStorage(updatedSuggestions, updatedIds);
          return {
            ...prev,
            suggestions: updatedSuggestions,
            processedIds: updatedIds,
            progress: { done, total: toProcess.length },
          };
        });

      } catch (e) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : 'Errore di rete',
          suggestions: [...prev.suggestions, ...newSuggestions],
          processedIds: [...prev.processedIds, ...newProcessedIds],
          progress: prev.progress ? { ...prev.progress, done } : null,
        }));
        return;
      }
    }

    setState(prev => ({
      ...prev,
      loading: false,
      progress: { done: toProcess.length, total: toProcess.length },
    }));
  }, [state.processedIds]);

  const toggleApproval = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      suggestions: prev.suggestions.map(s => s.id === id ? { ...s, approved: !s.approved } : s),
    }));
  }, []);

  const setAllApproved = useCallback((approved: boolean) => {
    setState(prev => ({
      ...prev,
      suggestions: prev.suggestions.map(s => ({ ...s, approved })),
    }));
  }, []);

  const clearResults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(prev => ({
      ...prev,
      suggestions: [],
      processedIds: [],
      progress: null,
      error: null,
      rateLimitReset: null,
    }));
  }, []);

  return {
    suggestions: state.suggestions,
    processedIds: state.processedIds,
    progress: state.progress,
    loading: state.loading,
    error: state.error,
    rateLimitReset: state.rateLimitReset,
    run,
    toggleApproval,
    setAllApproved,
    clearResults,
  };
}
