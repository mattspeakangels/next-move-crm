// Link per i canali di contatto alternativi a Outlook (telefono, WhatsApp, Gmail, app email).

export type Channel = 'chiamata' | 'whatsapp' | 'gmail' | 'email';

export interface ChannelPerson { key: string; label: string; phone: string; email: string }

/** Numero per wa.me: solo cifre, con prefisso Italia se manca. */
export function toWhatsAppNumber(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed.replace(/\D/g, '');
  const d = trimmed.replace(/\D/g, '');
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('39') && d.length >= 11) return d;
  return d ? `39${d}` : '';
}

export function channelUrl(channel: Channel, p: ChannelPerson, company: string): string {
  const subject = encodeURIComponent(company ? `${company} - ` : '');
  switch (channel) {
    case 'chiamata': return `tel:${p.phone.replace(/[^\d+]/g, '')}`;
    case 'whatsapp': return `https://wa.me/${toWhatsAppNumber(p.phone)}`;
    case 'gmail': return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(p.email.trim())}&su=${subject}`;
    case 'email': return `mailto:${encodeURIComponent(p.email.trim())}?subject=${subject}`;
  }
}
