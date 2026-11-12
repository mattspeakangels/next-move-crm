import { Contact, ContactSegment } from '../types';

// Lettura dei CSV di contatti: righe tra virgolette, separatori, classificazione del segmento.

// Parser CSV che gestisce campi tra virgolette, separatori multipli, \r\n e BOM
export const parseCSVLine = (line: string, sep: string): string[] => {
  const result: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (line.slice(i, i + sep.length) === sep) {
        result.push(field.trim());
        field = '';
        i += sep.length - 1;
      } else {
        field += ch;
      }
    }
  }
  result.push(field.trim());
  console.log('🎉 PARSECSV COMPLETED:', result.length, 'contatti');
  return result;
};

// Divide il CSV in record rispettando campi tra virgolette che contengono newline
export const splitCSVRecords = (text: string): string[] => {
  const records: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; current += ch; }
    } else if (ch === '\n' && !inQuotes) {
      if (current.trim()) records.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) records.push(current);
  return records;
};

export const classifySegment = (industry: string = '', company: string = ''): ContactSegment => {
  const text = ((industry || '') + ' ' + (company || '')).toLowerCase();
  if (text.match(/rivendit|ferramenta|hardware|magazzin|distribu|consorz|agrario|edile|negozio|shop/)) return 'dealer';
  if (text.match(/costruz|edil|cantier|impresa|carpentr|murature|edilizia/)) return 'edilizia';
  return 'industria';
};

export const parseCSVContacts = (text: string, fallbackStatus: 'potenziale' | 'cliente'): Contact[] => {
  // Rimuovi BOM e normalizza line endings
  const cleaned = text.replace(/\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = splitCSVRecords(cleaned);
  if (lines.length < 2) return [];

  // ─── Rileva il separatore ───
  const firstLine = lines[0];
  let separator = ',';
  if (firstLine.includes('\t')) separator = '\t';
  else if (firstLine.includes('|')) separator = '|';
  else if (firstLine.includes(';') && (firstLine.split(';').length > firstLine.split(',').length)) separator = ';';

  const headerLine = parseCSVLine(lines[0], separator).map(h => h.toLowerCase().replace(/["""'']/g, ''));

  // ─── findColumn: itera keywords in priorità, non colonne ───
  // In questo modo il primo keyword più specifico vince sempre.
  const findColumn = (keywords: string[]): number => {
    for (const kw of keywords) {
      const idx = headerLine.findIndex(h => h.includes(kw.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // Trova TUTTE le colonne che matchano almeno un keyword (escluse quelle con excludes)
  const findAllColumns = (includes: string[], excludes: string[] = []): number[] => {
    const results: number[] = [];
    headerLine.forEach((h, i) => {
      const matched = includes.some(kw => h.includes(kw.toLowerCase()));
      const excluded = excludes.some(kw => h.includes(kw.toLowerCase()));
      if (matched && !excluded) results.push(i);
    });
    return results;
  };

  // Mapping colonne — keywords in ordine di specificità (più specifico prima)
  const col: Record<string, number> = {
    company:     findColumn(['aziende', 'ragione sociale', 'nome azienda', 'company name', 'azienda', 'company', 'organizzazione', 'organization', 'name']),
    status:      findColumn(['stato azienda', 'stato cliente', 'stato', 'status']),
    businessType: findColumn(['tipologia cliente', 'tipo di cliente', 'tipo cliente', 'tipologia', 'canale', 'segmento cliente', 'segmento', 'customer type', 'business type']),
    contactName: findColumn(['referente', 'contatto principale', 'nome contatto', 'contatto', 'contact name', 'contact', 'person']),
    role:        findColumn(['ruolo', 'qualifica', 'posizione', 'role', 'title', 'job']),
    phone:       findColumn(['numero di telefono', 'telefono fisso', 'telefono 1', 'telefono', 'telefoni', 'phone', 'tel ']),
    mobile:      findColumn(['cellulare', 'mobile', 'cell', 'telefono 2']),
    website:     findColumn(['web', 'sito web', 'website', 'url', 'sito']),
    address:     findColumn(['indirizzo', 'address', 'via ', 'strada', 'street']),
    city:        findColumn(['citt', 'city', 'comune', 'località']),
    province:    findColumn(['provincia', 'province', 'prov']),
    zipCode:     findColumn(['codice postale', 'cap', 'zip', 'postal']),
    sector:      findColumn(['settore', 'sector', 'industria', 'attività', 'categoria']),
    notes:       findColumn(['commenti', 'note', 'notes', 'comments', 'osservazioni']),
  };

  // Tutte le colonne email (info, vendite, direzione, tecnico, ecc.) escludendo i flag "verificate"
  const emailCols = findAllColumns(['email', 'e-mail', 'mail', 'posta'], ['verificat']);

  const get = (row: string[], key: string): string =>
    col[key] >= 0 ? (row[col[key]] ?? '').trim() : '';

  // Prima email non vuota tra tutte le colonne email trovate
  const getEmail = (row: string[]): string =>
    emailCols.map(i => (row[i] ?? '').trim()).find(v => v) ?? '';

  const parseStatus = (raw: string): 'potenziale' | 'cliente' => {
    const v = raw.toLowerCase().trim();
    if (v.includes('client') || v.includes('enduser') || v === 'attivo' || v === 'active') return 'cliente';
    if (v.includes('potenzial') || v.includes('prospect') || v.includes('lead')) return 'potenziale';
    return fallbackStatus;
  };

  // Tipologia cliente esplicita (Dealer / End User) da colonna dedicata, se presente:
  // ha priorità sull'euristica basata su settore/nome azienda che spesso sbaglia.
  const parseBusinessType = (raw: string): ContactSegment | null => {
    const v = raw.toLowerCase().trim();
    if (!v) return null;
    if (v.match(/dealer|rivendit|distribu|reseller/)) return 'dealer';
    if (v.match(/end.?user|utilizzat|finale/)) return 'end-user';
    return null;
  };

  const result: Contact[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, separator);

    // Fallback: se nessuna colonna company trovata, usa la prima colonna
    const company = col['company'] >= 0 ? values[col['company']] || '' : values[0] || '';
    if (!company) continue;

    // Telefono: preferisce 'phone', poi 'mobile'; prende solo il primo numero se ce ne sono più
    const rawPhone = get(values, 'phone') || get(values, 'mobile');
    const phone = rawPhone.split(',')[0].trim();

    // Status: dalla colonna CSV se disponibile, altrimenti fallbackStatus
    const statusRaw = get(values, 'status');
    const contactStatus = statusRaw ? parseStatus(statusRaw) : fallbackStatus;

    const sectorVal = get(values, 'sector');
    const explicitBusinessType = parseBusinessType(get(values, 'businessType'));
    const segmentVal = explicitBusinessType || classifySegment(sectorVal, company);
    result.push({
      id: `c_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
      company,
      contactName: get(values, 'contactName'),
      role:        get(values, 'role'),
      email:       getEmail(values),
      phone,
      website:     get(values, 'website'),
      address:     get(values, 'address'),
      city:        get(values, 'city'),
      province:    get(values, 'province'),
      zipCode:     get(values, 'zipCode'),
      region:      get(values, 'province'),
      sector:      sectorVal,
      segment:     segmentVal,
      notes:       get(values, 'notes'),
      status:      contactStatus,
      country:     'Italia',
      createdAt:   Date.now(),
      updatedAt:   Date.now(),
    });
  }
  return result;
};
