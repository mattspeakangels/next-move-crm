import { useState } from 'react';
import { Phone, MessageCircle, Mail, Check, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ActivityType, Contact } from '../../types';
import { channelUrl, type Channel, type ChannelPerson as Person } from '../../lib/contactChannels';

// Canali di contatto alternativi: se Outlook è fermo si scrive o si chiama
// da WhatsApp, telefono o Gmail, e il contatto resta nel diario del cliente.

const CHANNEL_LABEL: Record<Channel, string> = {
  chiamata: 'Chiamata',
  whatsapp: 'WhatsApp',
  gmail: 'Gmail',
  email: 'Email',
};

const CHANNEL_TYPE: Record<Channel, ActivityType> = {
  chiamata: 'chiamata',
  whatsapp: 'nota',
  gmail: 'email',
  email: 'email',
};

export function ContactQuickChannels({ contact }: { contact: Contact }) {
  const { addActivity } = useStore();
  const [pending, setPending] = useState<{ channel: Channel; person: Person } | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const people: Person[] = [
    { key: 'main', label: contact.contactName || contact.company, phone: contact.phone || '', email: contact.email || '' },
    ...(contact.stakeholders || []).map(s => ({
      key: s.id,
      label: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.name || s.role || 'Referente',
      phone: s.phone || '',
      email: s.email || '',
    })),
  ].filter(p => p.phone.trim() || p.email.trim());

  if (people.length === 0) return null;

  const open = (channel: Channel, person: Person) => {
    const url = channelUrl(channel, person, contact.company);
    if (url.startsWith('http')) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
    setPending({ channel, person });
    setNote('');
    setSaved(false);
  };

  const log = () => {
    if (!pending) return;
    const now = Date.now();
    addActivity({
      id: `act_${now}`,
      contactId: contact.id,
      type: CHANNEL_TYPE[pending.channel],
      date: now,
      outcome: 'fatto',
      notes: `${CHANNEL_LABEL[pending.channel]} con ${pending.person.label}${note.trim() ? ` - ${note.trim()}` : ''}`,
      createdAt: now,
    });
    setPending(null);
    setSaved(true);
  };

  const btn = 'flex items-center gap-1.5 px-3 py-2 rounded-panel border border-line text-xs font-semibold hover:bg-raised transition-colors';

  return (
    <section className="bg-surface p-4 md:p-6 rounded-panel shadow-sm space-y-3">
      <div>
        <h3 className="font-semibold text-lg">Contatta</h3>
        <p className="text-sm text-muted">Canali alternativi a Outlook. Il contatto si registra nel diario del cliente.</p>
      </div>
      {people.map(p => (
        <div key={p.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm font-semibold min-w-0 sm:w-40 truncate">{p.label}</span>
          <div className="flex flex-wrap gap-2">
            {p.phone.trim() && <button type="button" className={btn} onClick={() => open('chiamata', p)}><Phone size={14} /> Chiama</button>}
            {p.phone.trim() && <button type="button" className={btn} onClick={() => open('whatsapp', p)}><MessageCircle size={14} /> WhatsApp</button>}
            {p.email.trim() && <button type="button" className={btn} onClick={() => open('gmail', p)}><Mail size={14} /> Gmail</button>}
            {p.email.trim() && <button type="button" className={btn} onClick={() => open('email', p)}><Mail size={14} /> Altra app</button>}
          </div>
        </div>
      ))}
      {pending && (
        <div className="border border-accent rounded-panel p-3 space-y-2 bg-accent-soft/20">
          <p className="text-sm font-semibold">Registrare nel diario: {CHANNEL_LABEL[pending.channel]} con {pending.person.label}?</p>
          <input
            className="w-full border border-line rounded-md p-2 bg-canvas text-foreground text-sm"
            placeholder="Nota (facoltativa)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" onClick={log} className="flex items-center gap-1 bg-action text-action-foreground px-3 py-2 rounded-md text-xs font-semibold"><Check size={14} /> Registra</button>
            <button type="button" onClick={() => setPending(null)} className="flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold text-secondary"><X size={14} /> No</button>
          </div>
        </div>
      )}
      {saved && <p className="text-xs text-success font-semibold">Registrato nel diario.</p>}
    </section>
  );
}
