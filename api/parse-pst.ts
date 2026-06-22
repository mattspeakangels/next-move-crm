import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PSTFile, PSTFolder } from 'pst-extractor';

export interface PSTEvent {
  subject: string;
  start: string | null;   // ISO string
  end: string | null;
  location: string;
  organizer: string;
  body: string;
  isAllDay: boolean;
  duration: number;       // minutes
  messageClass: string;
}

function findCalendarFolder(folder: any): any {
  if (folder.displayName === 'Calendar') return folder;
  try {
    for (const sub of folder.getSubFolders()) {
      try {
        const found = findCalendarFolder(sub);
        if (found) return found;
      } catch { /* skip system folders */ }
    }
  } catch { /* skip */ }
  return null;
}

function parsePST(filePath: string): PSTEvent[] {
  const pstFile = new PSTFile(filePath);
  const calFolder = findCalendarFolder(pstFile.getRootFolder());
  if (!calFolder) return [];

  const events: PSTEvent[] = [];
  let item = calFolder.getNextChild();

  while (item !== null) {
    try {
      const start: Date | undefined = item.startTime;
      const end: Date | undefined = item.endTime;
      const durationMs = start && end ? end.getTime() - start.getTime() : 0;

      let loc = '';
      try { loc = item.location || ''; } catch { /* */ }

      let org = '';
      try { org = item.organizerName || item.senderName || ''; } catch { /* */ }

      let body = '';
      try { body = (item.body || '').substring(0, 500).replace(/\r\n/g, '\n').trim(); } catch { /* */ }

      let allDay = false;
      try { allDay = !!item.isAllDayEvent; } catch { /* */ }

      events.push({
        subject: item.subject || '',
        start: start ? start.toISOString() : null,
        end: end ? end.toISOString() : null,
        location: loc,
        organizer: org,
        body,
        isAllDay: allDay,
        duration: Math.round(durationMs / 60000),
        messageClass: item.messageClass || 'IPM.Appointment',
      });
    } catch { /* skip malformed items */ }

    item = calFolder.getNextChild();
  }

  return events;
}

export default async function handler(
  req: { method: string; body: any },
  res: { status: (c: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data } = req.body as { data: string };
  if (!data) return res.status(400).json({ error: 'Missing base64 PST data' });

  const tmpPath = join(tmpdir(), `pst_${Date.now()}.pst`);

  try {
    const buffer = Buffer.from(data, 'base64');
    writeFileSync(tmpPath, buffer);

    const events = parsePST(tmpPath);
    return res.status(200).json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Parse failed' });
  } finally {
    try { unlinkSync(tmpPath); } catch { /* */ }
  }
}
