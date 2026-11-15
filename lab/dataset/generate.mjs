// Generatore deterministico del dataset del laboratorio Syrio.
//
// Produce 3 aziende fittizie (le caselle email "nostre"), i loro clienti, le opportunità
// e 800-1.000 email in italiano in ordine cronologico su 6 mesi. Ogni email porta la
// sua "risposta giusta" in `labels` (cliente, opportunità, tipo, richiesta/aggiornamento,
// chi deve agire): serve a misurare il motore di smistamento e apprendimento.
//
// Uso:  node lab/dataset/generate.mjs [--seed N] [--out percorso.json]
// Stesso seed → stesso file, byte per byte (nessun Math.random, nessuna data corrente).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng } from './rng.mjs';
import {
  FIRST_NAMES, LAST_NAMES, TOWNS, DEALER_PREFIX, ENDUSER_PREFIX, PUBLIC_PREFIX, LEGAL, PRODUCTS, GENERIC_DOMAINS,
} from './names.mjs';

export const DATASET_VERSION = 1;
export const DEFAULT_SEED = 20260501;
export const START = Date.UTC(2026, 4, 1, 0, 0, 0); // 1 maggio 2026
export const END = Date.UTC(2026, 10, 1, 0, 0, 0); // 1 novembre 2026 (escluso)
const THREAD_COUNT = 165;
const NOISE_SHARE = 0.4;

const HOUR = 3600_000;
const DAY = 24 * HOUR;

// ─── utilità di testo ─────────────────────────────────────────────────────────

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const pad = (n, w) => String(n).padStart(w, '0');

const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
function quoteDate(t) {
  const d = new Date(t);
  return `${GIORNI[d.getUTCDay()]} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()} alle ore ${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}`;
}
const longDate = (t) => { const d = new Date(t); return `${d.getUTCDate()} ${MESI_LUNGHI[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

/** Porta un istante in orario d'ufficio (lun-ven, 8-18). */
function toOfficeHours(t, rng) {
  let d = new Date(t);
  const h = d.getUTCHours();
  if (h < 8 || h >= 18) {
    if (h >= 18) d = new Date(d.getTime() + DAY);
    d.setUTCHours(rng.int(8, 11), rng.int(0, 59), rng.int(0, 59), 0);
  }
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = new Date(d.getTime() + DAY);
  return d.getTime();
}

/** Refusi controllati dal seed: scambio di lettere, accento perso, lettera doppia o mancante. */
function addTypos(text, rng) {
  const words = text.split(' ');
  const n = rng.int(1, 3);
  let done = 0;
  const touched = new Set();
  for (let k = 0; k < n * 4 && done < n; k++) {
    const i = rng.int(0, words.length - 1);
    const w = words[i];
    if (touched.has(i) || w.length < 5 || /[@:/\d\n]/.test(w)) continue;
    const kind = rng.int(0, 3);
    const j = rng.int(1, w.length - 3);
    let nw = w;
    if (kind === 0) nw = w.slice(0, j) + w[j + 1] + w[j] + w.slice(j + 2);
    else if (kind === 1 && /[àèéìòù]/.test(w)) nw = w.replace(/[àèéìòù]/, (c) => ({ à: "a'", è: "e'", é: "e'", ì: "i'", ò: "o'", ù: "u'" })[c]);
    else if (kind === 2) nw = w.slice(0, j) + w[j] + w.slice(j);
    else nw = w.slice(0, j) + w.slice(j + 1);
    if (nw !== w) { words[i] = nw; touched.add(i); done++; }
  }
  return { text: words.join(' '), typos: done };
}

// ─── persone e aziende ────────────────────────────────────────────────────────

function personFactory(rng) {
  const used = new Set();
  return function person() {
    for (;;) {
      const first = rng.pick(FIRST_NAMES);
      const last = rng.pick(LAST_NAMES);
      const key = `${first} ${last}`;
      if (!used.has(key)) { used.add(key); return { first, last, name: key }; }
    }
  };
}

function businessEmail(p, domain, rng) {
  const f = slug(p.first), l = slug(p.last);
  const local = rng.weighted([[`${f}.${l}`, 5], [`${f[0]}.${l}`, 3], [`${f}`, 1]]);
  return `${local}@${domain}`;
}
const genericEmail = (p, rng) => `${slug(p.first)}${rng.pick(['.', '', '_'])}${slug(p.last)}${rng.int(60, 99)}@${rng.pick(GENERIC_DOMAINS)}`;
const phone = (rng) => `0${rng.int(30, 39)} 555 ${rng.int(1000, 9999)}`;

const OUR_COMPANIES = [
  { id: 'az-distributore', kind: 'distributore', name: 'Dorsali Distribuzione Srl', domain: 'dorsali-distribuzione.it' },
  { id: 'az-personalizzatore', kind: 'personalizzatore', name: 'Ricamificio Lumen Snc', domain: 'ricamificiolumen.it' },
  { id: 'az-agente', kind: 'agente', name: 'Agenzia Ferretti Rappresentanze', domain: 'agenziaferretti.it' },
];

const ROLE_LABEL = { commerciale: 'Area commerciale', customer_service: 'Customer service', personalizzazione: 'Ufficio personalizzazione' };

function buildCompanies(rng, person) {
  return OUR_COMPANIES.map((c) => {
    const roles = ['commerciale', 'commerciale', 'customer_service', rng.chance(0.5) ? 'customer_service' : 'commerciale', 'personalizzazione'];
    const colleagues = roles.map((role, i) => {
      const p = person();
      return { id: `${c.id}-col-${i + 1}`, companyId: c.id, name: p.name, first: p.first, last: p.last, role, email: businessEmail(p, c.domain, rng), phone: phone(rng) };
    });
    return { ...c, colleagues };
  });
}

function buildCustomers(rng, company, person, nextId, usedNames) {
  const n = rng.int(18, 26);
  const list = [];
  let publicCount = 0;
  for (let i = 0; i < n; i++) {
    const type = i < Math.round(n * 0.4) ? 'dealer' : 'end_user';
    const isPublic = type === 'end_user' && (publicCount < 3 || rng.chance(0.2));
    let name, domain, sector;
    for (;;) {
      const town = rng.pick(TOWNS);
      if (type === 'dealer') {
        name = `${rng.pick(DEALER_PREFIX)} ${rng.pick(LAST_NAMES)} ${rng.pick(LEGAL)}`;
        sector = 'rivendita';
      } else if (isPublic) {
        name = `${rng.pick(PUBLIC_PREFIX)} ${town}`;
        sector = 'pubblica amministrazione';
      } else {
        const pre = rng.pick(ENDUSER_PREFIX);
        name = `${pre} ${rng.pick(LAST_NAMES)} ${rng.pick(LEGAL)}`;
        sector = pre.toLowerCase();
      }
      if (!usedNames.has(name)) { usedNames.add(name); break; }
    }
    if (isPublic) publicCount++;
    const base = slug(name.replace(/ (Srl|Snc|Sas|Spa)$/, ''));
    domain = isPublic ? `${base}.pa.it` : `${base}.it`;
    const id = nextId('cust', 3);
    const contactCount = rng.int(1, 3);
    const contacts = [];
    for (let k = 0; k < contactCount; k++) {
      const p = person();
      // Piccoli rivenditori e alcuni titolari scrivono da caselle generiche.
      const generic = !isPublic && rng.chance(type === 'dealer' ? 0.3 : 0.12);
      contacts.push({
        id: `${id}-ref-${k + 1}`, name: p.name, first: p.first, last: p.last,
        role: isPublic ? rng.pick(['Ufficio economato', 'RUP', 'Ufficio acquisti']) : rng.pick(['Titolare', 'Ufficio acquisti', 'Responsabile sicurezza', 'Amministrazione', 'Responsabile magazzino']),
        email: generic ? genericEmail(p, rng) : businessEmail(p, domain, rng), phone: phone(rng),
      });
    }
    list.push({
      id, companyId: company.id, name, type, publicBody: isPublic, sector, town: rng.pick(TOWNS), domain,
      ownerId: rng.pick(company.colleagues.filter((c) => c.role === 'commerciale')).id, contacts,
    });
  }
  return list;
}

// ─── firme ────────────────────────────────────────────────────────────────────

function customerSignature(contact, customer, rng) {
  if (rng.chance(0.15)) return `\n\n${contact.first}\nInviato da iPhone`;
  const closing = rng.pick(['Cordiali saluti', 'Saluti', 'Grazie, saluti', 'Buona giornata', 'Distinti saluti']);
  return `\n\n${closing}\n${contact.name}\n${contact.role}\n${customer.name}\nTel. ${contact.phone}`;
}
function ourSignature(col, company, rng) {
  const closing = rng.pick(['Cordiali saluti', 'Un saluto', 'Resto a disposizione, saluti', 'Grazie e buon lavoro']);
  return `\n\n${closing}\n${col.name}\n${ROLE_LABEL[col.role]}\n${company.name}\nTel. ${col.phone}\nwww.${company.domain}`;
}

// ─── conversazioni (thread) ───────────────────────────────────────────────────
// Ogni passo: side 'c' (cliente) o 'i' (interno), testo, kind, chi deve agire.

function itemsText(items) {
  return items.map((it) => `- ${it.qty} ${it.product}`).join('\n');
}
function pickItems(rng) {
  return rng.sample(PRODUCTS, rng.int(1, 3)).map((product) => ({ product, qty: rng.int(2, 30) * 10 }));
}
const cig = (rng) => `B${Array.from({ length: 9 }, () => '0123456789ABCDEF'[rng.int(0, 15)]).join('')}`;

const TEMPLATES = {
  offerta(ctx) {
    const { rng, items, deal } = ctx;
    const steps = [
      { side: 'c', kind: 'richiesta', actor: 'commerciale', subject: rng.pick(['Richiesta offerta', 'Richiesta preventivo', 'Preventivo abbigliamento da lavoro', 'Quotazione articoli']),
        body: `${rng.pick(['Buongiorno', 'Salve', 'Buongiorno,'])}\n${rng.pick(['vorremmo ricevere la vostra migliore offerta per:', 'ci servirebbe un preventivo per i seguenti articoli:', 'potete quotarci questi articoli?'])}\n${itemsText(items)}\n${rng.pick(['Consegna entro fine mese se possibile.', 'Ci servono le taglie dalla S alla XXL.', 'Indicateci anche i tempi di consegna.', 'Se avete un listino aggiornato mandatecelo pure.'])}` },
      { side: 'i', kind: 'aggiornamento', actor: 'cliente', role: 'commerciale', attachments: [`Offerta_${deal.code}.pdf`],
        body: `Buongiorno,\nin allegato la nostra offerta n. ${deal.code} per gli articoli richiesti.\nValidità 30 giorni, consegna in ${rng.int(2, 5)} settimane dalla conferma.\nRestiamo a disposizione per eventuali chiarimenti.` },
    ];
    const outcome = rng.weighted([['vinto', 4], ['perso', 2], ['aperto', 4]]);
    if (outcome === 'vinto') {
      steps.push({ side: 'c', kind: 'richiesta', actor: 'commerciale', newSenderChance: 0.25,
        body: `${rng.pick(['Buongiorno', 'Ciao'])},\n${rng.pick(['va bene, procediamo con l\'ordine come da vostra offerta.', 'confermiamo l\'offerta, potete procedere.', 'ok per l\'offerta, vi mandiamo l\'ordine formale in giornata.'])}` });
      steps.push({ side: 'i', kind: 'aggiornamento', actor: 'cliente', role: 'customer_service', ccRole: 'commerciale',
        body: `Buongiorno,\ngrazie per la conferma. Abbiamo inserito l'ordine, la consegna è prevista per il ${'{DATA+20}'}.\nVi aggiorniamo alla spedizione.` });
    } else if (outcome === 'perso') {
      steps.push({ side: 'c', kind: 'aggiornamento', actor: 'commerciale',
        body: `Buongiorno,\n${rng.pick(['purtroppo abbiamo ricevuto un\'offerta più conveniente, per questa volta non procediamo.', 'il prezzo è fuori dal nostro budget, rimandiamo la fornitura.', 'il cliente finale ha deciso di rinviare, vi faremo sapere.'])}` });
    } else if (rng.chance(0.6)) {
      steps.push({ side: 'c', kind: 'richiesta', actor: 'commerciale', newSenderChance: 0.25,
        body: `Buongiorno,\n${rng.pick(['riuscite a fare uno sconto se raddoppiamo le quantità?', 'potete inviarci anche dei campioni delle taglie?', 'i tempi di consegna si possono ridurre?'])}` });
    }
    return { steps, stage: outcome === 'vinto' ? 'chiuso-vinto' : outcome === 'perso' ? 'chiuso-perso' : (steps.length > 2 ? 'negoziazione' : 'proposta') };
  },

  gara(ctx) {
    const { rng, deal, items } = ctx;
    const lotti = rng.int(1, 4);
    const scad = ctx.start + rng.int(10, 25) * DAY;
    deal.cig = cig(rng);
    deal.lotti = lotti;
    deal.scadenza = new Date(scad).toISOString().slice(0, 10);
    const steps = [
      { side: 'c', kind: 'richiesta', actor: 'commerciale', subject: `RdO MEPA n. ${rng.int(4000000, 4999999)} - fornitura vestiario - CIG ${deal.cig}`,
        body: `Spett.le ditta,\nsi comunica l'avvio della Richiesta di Offerta sul Mercato Elettronico per la fornitura di vestiario e DPI.\nCIG: ${deal.cig}\nLotti: ${lotti}\n${itemsText(items)}\nTermine per la presentazione delle offerte: ${longDate(scad)} ore 12:00.\nLa documentazione è disponibile sul portale.` },
      { side: 'i', kind: 'aggiornamento', actor: 'cliente', role: 'commerciale',
        body: `Buongiorno,\nconfermiamo l'interesse a partecipare. Chiediamo un chiarimento sul lotto ${rng.int(1, lotti)}: le taglie vanno quotate a prezzo unico o differenziato?` },
      { side: 'c', kind: 'aggiornamento', actor: 'commerciale',
        body: `In riferimento al quesito pervenuto si precisa che il prezzo deve essere unico per tutte le taglie.\nIl termine resta invariato.` },
    ];
    const outcome = rng.weighted([['vinto', 3], ['perso', 3], ['aperto', 2]]);
    if (outcome !== 'aperto') {
      steps.push({ side: 'c', kind: 'aggiornamento', actor: outcome === 'vinto' ? 'customer_service' : 'commerciale', delayDays: [12, 25],
        body: outcome === 'vinto'
          ? `Si comunica l'aggiudicazione definitiva della RdO CIG ${deal.cig} a codesta ditta. Seguirà il documento di stipula.`
          : `Si comunica l'esito della RdO CIG ${deal.cig}: la fornitura è stata aggiudicata ad altro operatore. Grazie per la partecipazione.` });
    }
    return { steps, stage: outcome === 'vinto' ? 'chiuso-vinto' : outcome === 'perso' ? 'chiuso-perso' : 'proposta' };
  },

  personalizzazione(ctx) {
    const { rng, deal, items } = ctx;
    const where = rng.pick(['sul petto a sinistra', 'sulla schiena', 'sulla manica destra', 'petto e schiena']);
    const tech = rng.pick(['ricamo', 'stampa serigrafica', 'transfer']);
    const steps = [
      { side: 'c', kind: 'richiesta', actor: 'personalizzazione', ccRole: 'commerciale', subject: rng.pick(['Logo su capi', 'Personalizzazione con logo', 'Ricamo logo aziendale']), attachments: ['logo.png'],
        body: `Buongiorno,\nvi mando il logo da mettere ${where} su:\n${itemsText(items)}\nPreferiremmo ${tech}. Ci mandate un rendering prima di procedere?` },
      { side: 'i', kind: 'aggiornamento', actor: 'cliente', role: 'personalizzazione', attachments: [`rendering_${deal.code}_v1.pdf`],
        body: `Buongiorno,\nin allegato il rendering v1 con il logo ${where} (${tech}).\nAttendiamo vostra approvazione o eventuali modifiche.` },
    ];
    const rounds = rng.int(0, 2);
    for (let v = 2; v <= rounds + 1; v++) {
      steps.push({ side: 'c', kind: 'richiesta', actor: 'personalizzazione', newSenderChance: 0.2,
        body: `${rng.pick(['Buongiorno', 'Ciao'])},\n${rng.pick(['il logo è un po\' troppo grande, potete ridurlo del 20%?', 'il colore non è quello giusto, deve essere più scuro.', 'potete spostarlo un po\' più in alto?', 'aggiungete anche la scritta sotto il logo.'])}` });
      steps.push({ side: 'i', kind: 'aggiornamento', actor: 'cliente', role: 'personalizzazione', attachments: [`rendering_${deal.code}_v${v}.pdf`],
        body: `Ecco il rendering v${v} con le modifiche richieste. Fateci sapere.` });
    }
    const approved = rng.chance(0.75);
    if (approved) {
      steps.push({ side: 'c', kind: 'aggiornamento', actor: 'personalizzazione',
        body: `${rng.pick(['Perfetto', 'Va benissimo', 'Ok approvato'])}, procedete pure con la produzione.` });
    }
    return { steps, stage: approved ? 'chiuso-vinto' : 'negoziazione' };
  },

  ordine(ctx) {
    const { rng, items, deal } = ctx;
    const po = `${rng.int(100, 999)}/${new Date(ctx.start).getUTCFullYear()}`;
    deal.orderRef = po;
    const steps = [
      { side: 'c', kind: 'richiesta', actor: 'customer_service', subject: `Ordine n. ${po}`, attachments: [`ordine_${po.replace('/', '-')}.pdf`],
        body: `Buongiorno,\nin allegato il nostro ordine n. ${po}:\n${itemsText(items)}\n${rng.pick(['Consegna presso la sede.', 'Consegna in cantiere, vi mando l\'indirizzo.', 'Fatturazione come da accordi.'])}` },
      { side: 'i', kind: 'aggiornamento', actor: 'cliente', role: 'customer_service',
        body: `Buongiorno,\nconfermiamo la ricezione dell'ordine ${po}. Consegna prevista entro ${rng.int(7, 20)} giorni lavorativi.` },
    ];
    if (rng.chance(0.4)) {
      steps.push({ side: 'c', kind: 'richiesta', actor: 'customer_service', newSenderChance: 0.3,
        body: `Buongiorno,\n${rng.pick(['possiamo cambiare l\'indirizzo di consegna?', 'aggiungete 10 pezzi taglia L allo stesso ordine.', 'ci serve il DDT anticipato via mail.'])}` });
      steps.push({ side: 'i', kind: 'aggiornamento', actor: 'cliente', role: 'customer_service', body: 'Fatto, abbiamo aggiornato l\'ordine. Grazie.' });
    }
    return { steps, stage: 'chiuso-vinto' };
  },

  sollecito(ctx) {
    const { rng, deal } = ctx;
    const steps = [
      { side: 'c', kind: 'richiesta', actor: deal.stage === 'chiuso-vinto' ? 'customer_service' : 'commerciale', subject: rng.pick(['Sollecito', 'Aggiornamento?', `R: ${deal.title}`, 'Notizie consegna']),
        body: `${rng.pick(['Buongiorno', 'Salve'])},\n${deal.stage === 'chiuso-vinto'
          ? rng.pick(['a che punto è la nostra consegna? Il cantiere parte lunedì.', 'non abbiamo ancora ricevuto la merce, potete verificare?', 'ci sapete dire quando spedite?'])
          : rng.pick(['avete novità sull\'offerta che vi avevamo chiesto?', 'attendiamo ancora il preventivo, potete sollecitare?', 'ci servirebbe una risposta entro venerdì.'])}` },
      { side: 'i', kind: 'aggiornamento', actor: 'cliente', role: deal.stage === 'chiuso-vinto' ? 'customer_service' : 'commerciale',
        body: `Buongiorno,\n${deal.stage === 'chiuso-vinto' ? `la merce parte domani, vi giro il tracking appena disponibile.` : `ci scusiamo per il ritardo, l'offerta arriva entro domani.`}` },
    ];
    return { steps, stage: null };
  },

  reclamo(ctx) {
    const { rng } = ctx;
    const steps = [
      { side: 'c', kind: 'richiesta', actor: 'customer_service', ccRole: 'commerciale', subject: rng.pick(['Reclamo merce', 'Problema con la consegna', 'Capi difettosi', 'Taglie sbagliate']),
        body: `Buongiorno,\n${rng.pick(['abbiamo ricevuto la merce ma 12 capi hanno le cuciture aperte.', 'le taglie consegnate non corrispondono all\'ordine.', 'il logo è stampato storto su metà dei capi.', 'manca un collo della spedizione.'])}\n${rng.pick(['Come procediamo?', 'Chiediamo la sostituzione urgente.', 'Siamo molto delusi, è la seconda volta.'])}` },
      { side: 'i', kind: 'aggiornamento', actor: 'cliente', role: 'customer_service',
        body: `Buongiorno,\nci scusiamo per il disagio. Abbiamo aperto la pratica di reso, il corriere passerà a ritirare i capi e invieremo la sostituzione.` },
    ];
    if (rng.chance(0.6)) steps.push({ side: 'c', kind: 'aggiornamento', actor: 'customer_service', body: 'Ok grazie, attendiamo il corriere.' });
    return { steps, stage: null };
  },
};

// ─── rumore (newsletter, notifiche, personali) ────────────────────────────────

const NEWSLETTER = [
  ['Fiera Lavoro Sicuro', 'newsletter@fieralavorosicuro.it', 'Fiera Lavoro Sicuro: le novità dell\'edizione autunnale', 'Scopri gli espositori e prenota il tuo ingresso gratuito.'],
  ['TessilNews', 'news@tessilnews.it', 'TessilNews — prezzi del cotone in aumento', 'Il punto settimanale sul mercato dei tessuti tecnici.'],
  ['Associazione Distributori DPI', 'info@assodistributoridpi.it', 'Webinar: la nuova norma sull\'alta visibilità', 'Iscriviti al webinar gratuito di giovedì alle 15.'],
  ['Ufficio Stile Forniture', 'promo@ufficiostileforniture.it', 'Solo per questa settimana: -30% sulla cancelleria', 'Approfitta delle offerte riservate ai clienti business.'],
  ['Corso Vendite Pro', 'corsi@corsovenditepro.it', 'Come chiudere più trattative in autunno', 'Il nuovo corso online per i commerciali B2B.'],
];
const NOTIFICHE = [
  ['Corriere Rapido Nord', 'noreply@corrierarapidonord.it', () => 'La tua spedizione è in consegna', (r) => `La spedizione n. ${r.int(10000000, 99999999)} sarà consegnata oggi tra le 9 e le 13.`],
  ['Portale Fatture', 'notifiche@portalefatture.it', () => 'Ricevuta di consegna fattura elettronica', (r) => `La fattura n. ${r.int(100, 999)} è stata consegnata al destinatario.`],
  ['Portale Acquisti PA', 'noreply@portaleacquistipa.it', () => 'Nuovo bando pubblicato nella tua categoria', () => 'È stato pubblicato un nuovo avviso nella categoria merceologica a cui sei abilitato.'],
  ['Calendario', 'calendar-noreply@agendaufficio.it', () => 'Invito: riunione commerciale settimanale', () => 'Sei stato invitato alla riunione di lunedì alle 9:00.'],
  ['Sistema', 'no-reply@gestionaleufficio.it', () => 'Reimpostazione password', () => 'Abbiamo ricevuto una richiesta di reimpostazione della password. Se non sei stato tu ignora questo messaggio.'],
];
const PERSONALI = [
  ['Pranzo venerdì?', 'Ciao! Venerdì riusciamo a pranzare insieme? Fammi sapere'],
  ['Calcetto stasera', 'Stasera alle 21 al solito campo, ci sei?'],
  ['Foto della gita', 'Ti mando le foto di domenica, sono venute benissimo!'],
  ['Compleanno di mamma', 'Ricordati che sabato festeggiamo, porta tu la torta?'],
  ['Auto dal meccanico', 'Il meccanico ha chiamato, la macchina è pronta da domani.'],
];

// ─── generazione ──────────────────────────────────────────────────────────────

export function generateDataset(seed = DEFAULT_SEED) {
  const rng = makeRng(seed);
  const counters = {};
  const nextId = (prefix, width) => `${prefix}-${pad((counters[prefix] = (counters[prefix] ?? 0) + 1), width)}`;
  const person = personFactory(rng);

  const companies = buildCompanies(rng, person);
  const usedNames = new Set();
  const customers = companies.flatMap((c) => buildCustomers(rng, c, person, nextId, usedNames));
  const byCompany = Object.fromEntries(companies.map((c) => [c.id, customers.filter((x) => x.companyId === c.id)]));
  const colOf = (company, role, rngPick = true) => {
    const list = company.colleagues.filter((c) => c.role === role);
    return rngPick ? rng.pick(list) : list[0];
  };

  // 1. Inizi delle conversazioni, in ordine cronologico (lascia 1 settimana di coda).
  const starts = Array.from({ length: THREAD_COUNT }, () => toOfficeHours(START + Math.floor(rng.next() * (END - START - 7 * DAY)), rng)).sort((a, b) => a - b);

  const deals = [];
  const raw = []; // email senza id definitivo
  const dealState = new Map(); // customerId → { open: [], won: [] }

  for (const [ti, start] of starts.entries()) {
    const company = companies[ti % companies.length];
    const customer = rng.pick(byCompany[company.id]);
    const st = dealState.get(customer.id) ?? { open: [], won: [] };
    dealState.set(customer.id, st);

    const typeWeights = [
      ['offerta', 28],
      ['personalizzazione', company.kind === 'personalizzatore' ? 30 : 12],
      ['gara', customer.publicBody ? 30 : 0],
      ['ordine', 14],
      ['sollecito', st.open.length + st.won.length > 0 ? 16 : 0],
      ['reclamo', st.won.length > 0 ? 12 : 3],
    ];
    const type = rng.weighted(typeWeights);
    const items = pickItems(rng);

    let deal = null;
    if (type === 'sollecito') deal = rng.pick([...st.open, ...st.won]);
    else if (type === 'reclamo') deal = st.won.length ? rng.pick(st.won) : null;
    else if (type === 'ordine' && st.open.length && rng.chance(0.6)) deal = st.open.shift();
    if (!deal && type !== 'reclamo') {
      deal = {
        id: nextId('deal', 3), code: `${company.id.slice(3, 6).toUpperCase()}-${pad(counters.deal, 3)}`, companyId: company.id, customerId: customer.id,
        kind: type === 'sollecito' ? 'offerta' : type, title: `${{ offerta: 'Fornitura', gara: 'Gara MEPA', personalizzazione: 'Personalizzazione', ordine: 'Ordine', sollecito: 'Fornitura' }[type]} ${items[0].product} — ${customer.name}`,
        items, value: items.reduce((s, it) => s + it.qty * rng.int(8, 60), 0), stage: 'lead', ownerId: customer.ownerId, createdAt: new Date(start).toISOString(),
      };
      deals.push(deal);
    }

    const ctx = { rng, company, customer, items, deal: deal ?? { code: 'NA', title: '' }, start };
    const { steps, stage } = TEMPLATES[type](ctx);
    if (deal && stage) {
      deal.stage = stage;
      st.open = st.open.filter((d) => d !== deal);
      if (stage === 'chiuso-vinto') st.won.push(deal);
      else if (stage !== 'chiuso-perso') st.open.push(deal);
    }

    // 2. Messaggi della conversazione
    const threadId = nextId('thr', 3);
    const contact = rng.pick(customer.contacts);
    const subject0 = steps[0].subject;
    let t = start;
    let prev = null;
    const responsible = { commerciale: colOf(company, 'commerciale'), customer_service: colOf(company, 'customer_service'), personalizzazione: colOf(company, 'personalizzazione') };
    responsible.commerciale = company.colleagues.find((c) => c.id === customer.ownerId) ?? responsible.commerciale;
    let lastCustomerSender = contact;

    for (const [si, step] of steps.entries()) {
      if (si > 0) {
        const [a, b] = step.delayDays ?? [0, 3];
        t = toOfficeHours(t + rng.int(1, 6) * HOUR + rng.int(a, b) * DAY, rng);
      }
      if (t >= END) break;

      let from, to, direction, newSender = false, genericDomain = false;
      const cc = [];
      if (step.side === 'c') {
        let sender = lastCustomerSender;
        if (step.newSenderChance && rng.chance(step.newSenderChance) && !customer.publicBody) {
          // Un collega del cliente mai visto prima, stesso dominio aziendale.
          const p = person();
          sender = { id: null, name: p.name, first: p.first, last: p.last, role: rng.pick(['Ufficio acquisti', 'Amministrazione']), email: businessEmail(p, customer.domain, rng), phone: phone(rng) };
          newSender = true;
          cc.push(lastCustomerSender);
        }
        lastCustomerSender = sender;
        genericDomain = GENERIC_DOMAINS.some((d) => sender.email.endsWith(`@${d}`));
        from = sender;
        const target = prev?.direction === 'out' ? prev.from : responsible[step.actor] ?? responsible.commerciale;
        to = [target];
        if (step.ccRole && responsible[step.ccRole] !== target) cc.push(responsible[step.ccRole]);
        if (customer.contacts.length > 1 && rng.chance(0.2)) cc.push(customer.contacts.find((c) => c !== sender) ?? customer.contacts[0]);
        direction = 'in';
      } else {
        from = responsible[step.role];
        to = [lastCustomerSender];
        if (step.ccRole && responsible[step.ccRole] !== from) cc.push(responsible[step.ccRole]);
        if (rng.chance(0.15)) cc.push(rng.pick(company.colleagues.filter((c) => c !== from)));
        direction = 'out';
      }

      let body = step.body.replace('{DATA+20}', longDate(t + 20 * DAY));
      let typos = 0;
      if (step.side === 'c' && rng.chance(0.35)) ({ text: body, typos } = addTypos(body, rng));
      body += step.side === 'c' ? customerSignature(from, customer, rng) : ourSignature(from, company, rng);
      let quoted = false;
      if (prev && rng.chance(0.7)) {
        quoted = true;
        body += `\n\nIl giorno ${quoteDate(prev.t)} ${prev.from.name} <${prev.from.email}> ha scritto:\n${prev.body.split('\n').slice(0, 8).map((l) => `> ${l}`).join('\n')}`;
      }

      const actor = step.actor === 'cliente'
        ? { role: 'cliente', personId: lastCustomerSender.id ?? null }
        : { role: step.actor, personId: (responsible[step.actor] ?? responsible.commerciale).id };

      const msg = {
        t, threadId, mailbox: company.id, direction, from, to, cc,
        subject: si === 0 ? subject0 : `${rng.pick(['R: ', 'Re: ', 'RE: '])}${subject0}`,
        body, attachments: step.attachments ?? [], prev,
        labels: { customerId: customer.id, dealId: deal?.id ?? null, type, kind: step.kind, actor },
        meta: { typos, newSender, quoted, genericDomain },
      };
      raw.push(msg);
      prev = msg;
    }
  }

  // 3. Rumore: ~40% del totale.
  const businessCount = raw.length;
  const noiseCount = Math.round((businessCount * NOISE_SHARE) / (1 - NOISE_SHARE));
  for (let i = 0; i < noiseCount; i++) {
    const company = rng.pick(companies);
    const to = rng.pick(company.colleagues);
    const kind = rng.weighted([['newsletter', 45], ['notifica', 35], ['personale', 20]]);
    const t = START + Math.floor(rng.next() * (END - START - HOUR));
    let from, subject, body;
    if (kind === 'newsletter') {
      const [name, email, s, b] = rng.pick(NEWSLETTER);
      from = { name, email }; subject = s; body = `${b}\n\nPer non ricevere più queste comunicazioni clicca su "disiscriviti".`;
    } else if (kind === 'notifica') {
      const [name, email, s, b] = rng.pick(NOTIFICHE);
      from = { name, email }; subject = s(rng); body = b(rng);
    } else {
      const [s, b] = rng.pick(PERSONALI);
      const fromColleague = rng.chance(0.4);
      if (fromColleague) from = rng.pick(company.colleagues.filter((c) => c !== to));
      else { const p = person(); from = { name: p.name, email: genericEmail(p, rng) }; }
      subject = s; body = b;
    }
    const internal = company.colleagues.includes(from);
    raw.push({
      t, threadId: null, mailbox: company.id, direction: internal ? 'internal' : 'in', from, to: [to], cc: [], subject, body, attachments: [], prev: null,
      labels: { customerId: null, dealId: null, type: kind, kind: 'nessuna', actor: null },
      meta: { typos: 0, newSender: false, quoted: false, genericDomain: GENERIC_DOMAINS.some((d) => from.email.endsWith(`@${d}`)) },
    });
  }

  // 4. Ordine cronologico e id definitivi.
  const order = raw.map((m, i) => [m, i]).sort((a, b) => a[0].t - b[0].t || a[1] - b[1]).map(([m]) => m);
  const idOf = new Map(order.map((m, i) => [m, `mail-${pad(i + 1, 4)}`]));
  const addr = (p) => ({ name: p.name, email: p.email });
  const emails = order.map((m) => ({
    id: idOf.get(m), threadId: m.threadId, inReplyTo: m.prev ? idOf.get(m.prev) : null, mailbox: m.mailbox, direction: m.direction,
    date: new Date(m.t).toISOString(), from: addr(m.from), to: m.to.map(addr), cc: m.cc.map(addr),
    subject: m.subject, body: m.body, attachments: m.attachments, labels: m.labels, meta: m.meta,
  }));

  const strip = ({ first, last, ...rest }) => rest;
  return {
    meta: {
      version: DATASET_VERSION, seed, start: new Date(START).toISOString(), end: new Date(END).toISOString(),
      counts: { companies: companies.length, customers: customers.length, deals: deals.length, emails: emails.length, noise: noiseCount, threads: new Set(emails.map((e) => e.threadId).filter(Boolean)).size },
    },
    companies: companies.map((c) => ({ ...c, colleagues: c.colleagues.map(strip) })),
    customers: customers.map((c) => ({ ...c, contacts: c.contacts.map(strip) })),
    deals: deals.map(({ code, ...d }) => ({ code, ...d })),
    emails,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  const seed = Number(arg('--seed') ?? DEFAULT_SEED);
  const out = resolve(arg('--out') ?? fileURLToPath(new URL('./out/dataset.json', import.meta.url)));
  const ds = generateDataset(seed);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(ds, null, 2)}\n`);
  console.log(`Dataset scritto in ${out}`);
  console.log(JSON.stringify(ds.meta.counts));
}
