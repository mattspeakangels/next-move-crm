import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { auth } from './firebase';
import type { Activity, Contact } from '../types';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export interface GmailMessageMeta {
  id: string;
  internalDate: number;
  from: string;
  to: string;
  subject: string;
  snippet: string;
}

function extractEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  return (match ? match[1] : headerValue).trim().toLowerCase();
}

export async function connectGmail(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Devi essere loggato per collegare Gmail.');

  const provider = new GoogleAuthProvider();
  provider.addScope(GMAIL_SCOPE);
  // Se l'account è già collegato a Google basta ri-autenticarsi chiedendo lo
  // scope in più; altrimenti va collegato per la prima volta con linkWithPopup.
  const alreadyLinked = user.providerData.some(p => p.providerId === 'google.com');

  try {
    const result = alreadyLinked
      ? await reauthenticateWithPopup(user, provider)
      : await linkWithPopup(user, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google non ha restituito un access token valido.');
    }
    return credential.accessToken;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Collegamento annullato.');
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Il browser ha bloccato il popup: consenti i popup per questo sito e riprova.');
    }
    if (error.code === 'auth/credential-already-in-use') {
      throw new Error('Questo account Google è già collegato a un altro utente.');
    }
    throw error;
  }
}

export async function fetchRecentMessages(accessToken: string, days = 7): Promise<GmailMessageMeta[]> {
  const listRes = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`newer_than:${days}d`)}&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) {
    if (listRes.status === 401) throw new Error('Token Gmail scaduto: ricollega Gmail e riprova.');
    throw new Error(`Errore Gmail (${listRes.status}): impossibile leggere la lista messaggi.`);
  }
  const listData = await listRes.json();
  const ids: string[] = (listData.messages || []).map((m: { id: string }) => m.id);

  const messages: GmailMessageMeta[] = [];
  for (const id of ids) {
    const msgRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;
    const msg = await msgRes.json();
    const headers: { name: string; value: string }[] = msg.payload?.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
    messages.push({
      id: msg.id,
      internalDate: Number(msg.internalDate) || Date.now(),
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      snippet: msg.snippet || '',
    });
  }
  return messages;
}

export function matchContactsAndBuildActivities(
  messages: GmailMessageMeta[],
  contacts: Contact[],
  existingActivities: Activity[]
): Activity[] {
  const contactByEmail = new Map(
    contacts.filter(c => c.email).map(c => [c.email.trim().toLowerCase(), c])
  );
  const alreadyImported = new Set(
    existingActivities.filter(a => a.source === 'gmail' && a.externalId).map(a => a.externalId)
  );

  const activities: Activity[] = [];
  for (const message of messages) {
    if (alreadyImported.has(message.id)) continue;

    const fromEmail = extractEmail(message.from);
    const toEmail = extractEmail(message.to);
    const contact = contactByEmail.get(fromEmail) || contactByEmail.get(toEmail);
    if (!contact) continue;

    activities.push({
      id: `act_gmail_${message.id}`,
      contactId: contact.id,
      type: 'email',
      date: message.internalDate,
      outcome: 'nota',
      notes: message.subject ? `${message.subject}\n\n${message.snippet}` : message.snippet,
      createdAt: Date.now(),
      source: 'gmail',
      externalId: message.id,
    });
  }
  return activities;
}
