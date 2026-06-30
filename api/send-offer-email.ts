import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY non configurata' });

  const { to, subject, pdfBase64, pdfName, fromName, fromEmail } = req.body as {
    to: string;
    subject: string;
    pdfBase64: string;  // base64 without data: prefix
    pdfName: string;
    fromName?: string;
    fromEmail?: string;
  };

  if (!to || !subject || !pdfBase64 || !pdfName) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti' });
  }

  try {
    const resend = new Resend(apiKey);
    const from = fromName && fromEmail
      ? `${fromName} <${fromEmail}>`
      : `NextMove CRM <onboarding@resend.dev>`;

    await resend.emails.send({
      from,
      to: [to],
      subject,
      html: '<p>In allegato il preventivo richiesto.</p>',
      attachments: [
        {
          filename: pdfName,
          content: pdfBase64,
          // Resend accepts base64 string directly
        },
      ],
    });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Errore invio email' });
  }
}
