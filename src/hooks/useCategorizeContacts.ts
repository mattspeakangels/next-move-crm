import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Contact } from '../types';
import { AIClassification } from '../lib/aiCategories';

function buildContactData(
  contact: Contact,
  deals: Record<string, any>,
  activities: Record<string, any>,
) {
  const contactDeals = Object.values(deals).filter((d: any) => d.contactId === contact.id);
  const openDeals = contactDeals.filter(
    (d: any) => !['chiuso-vinto', 'chiuso-perso'].includes(d.stage),
  );
  const contactActs = Object.values(activities)
    .filter((a: any) => a.contactId === contact.id)
    .sort((a: any, b: any) => b.date - a.date);
  const daysSinceLast =
    contactActs.length > 0
      ? Math.floor((Date.now() - (contactActs[0] as any).date) / 86400000)
      : undefined;

  return {
    company: contact.company,
    status: contact.status,
    customerType: contact.customerType,
    segment: contact.segment,
    sector: contact.sector,
    city: contact.city,
    intelligence: contact.intelligence,
    dealCount: openDeals.length,
    dealTotalValue: openDeals.reduce((s: number, d: any) => s + d.value, 0),
    activityCount: contactActs.length,
    daysSinceLastActivity: daysSinceLast,
    notes: contact.notes,
  };
}

async function callCategorizeAPI(contact: Contact, deals: Record<string, any>, activities: Record<string, any>): Promise<AIClassification> {
  const token = import.meta.env.VITE_ADMIN_API_TOKEN;
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: 'categorizza-cliente',
      data: buildContactData(contact, deals, activities),
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      const seconds = parseInt(res.headers.get('Retry-After') || '3600', 10);
      throw new Error(`Limite raggiunto. Riprova tra ${Math.ceil(seconds / 60)} minuti.`);
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }

  const json = (await res.json()) as { result: string };
  const match = json.result.trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Risposta AI non valida');
  return JSON.parse(match[0]) as AIClassification;
}

export function useCategorizeContacts() {
  const { updateContact, deals, activities } = useStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categorize = async (contact: Contact): Promise<AIClassification | null> => {
    setLoadingId(contact.id);
    setError(null);
    try {
      const result = await callCategorizeAPI(contact, deals, activities);
      updateContact(contact.id, { classification: JSON.stringify(result) });
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
      return null;
    } finally {
      setLoadingId(null);
    }
  };

  const categorizeAll = async (contactList: Contact[]) => {
    setBulkProgress({ done: 0, total: contactList.length });
    setError(null);
    for (let i = 0; i < contactList.length; i++) {
      const contact = contactList[i];
      setLoadingId(contact.id);
      try {
        const result = await callCategorizeAPI(contact, deals, activities);
        updateContact(contact.id, { classification: JSON.stringify(result) });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Errore';
        if (msg.includes('Limite')) {
          setError(msg);
          break;
        }
      }
      setBulkProgress({ done: i + 1, total: contactList.length });
      if (i < contactList.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    setLoadingId(null);
    setBulkProgress(null);
  };

  return { categorize, categorizeAll, loadingId, bulkProgress, error };
}
