#!/usr/bin/env node
/**
 * Importa IMPORT_blaklader_NEW.csv nel CRM Next Move (localStorage Zustand).
 *
 * 1. Esegui questo script:  node import_to_crm.js
 * 2. Apri il CRM nel browser (http://localhost:5173)
 * 3. Apri DevTools → Console e incolla il comando stampato a schermo.
 * 4. Ricarica la pagina.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const CSV_FILE = path.join(__dirname, 'IMPORT_blaklader_NEW.csv');
const PORT = 19173;

// ── Replica classifySegment del CRM ──────────────────────────────────────────
function classifySegment(sector = '', company = '') {
  const text = (sector + ' ' + company).toLowerCase();
  if (/rivendit|ferramenta|hardware|magazzin|distribu|consorz|agrario|edile|negozio|shop/.test(text)) return 'dealer';
  if (/costruz|edil|cantier|impresa|carpentr|murature|edilizia/.test(text)) return 'edilizia';
  return 'industria';
}

// ── Parse CSV con separatore ; ────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  const headers = lines[0].split(';').map(h => h.trim().replace(/^﻿/, ''));
  const idx = k => headers.indexOf(k);

  const now = Date.now();
  const contacts = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const get = k => (cols[idx(k)] || '').trim();

    const company = get('Ragione Sociale');
    if (!company) continue;

    const sector  = get('Settore');
    const segment = classifySegment(sector, company);

    contacts.push({
      id:           crypto.randomUUID(),
      company,
      contactName:  '',
      role:         '',
      email:        '',
      phone:        '',
      website:      '',
      vatNumber:    get('Partita IVA'),
      address:      get('Indirizzo'),
      city:         get('Città'),
      zipCode:      get('Codice postale'),
      province:     get('Provincia'),
      country:      'IT',
      status:       'potenziale',
      customerType: 'end-user',
      segment,
      sector,
      region:       get('Provincia'),
      notes:        get('Note'),
      createdAt:    now,
      updatedAt:    now,
    });
  }
  return contacts;
}

// ── Leggi CSV ─────────────────────────────────────────────────────────────────
if (!fs.existsSync(CSV_FILE)) {
  console.error('File non trovato:', CSV_FILE);
  process.exit(1);
}

const csv  = fs.readFileSync(CSV_FILE, 'utf-8');
const contacts = parseCSV(csv);
console.log(`\n✅ Contatti preparati: ${contacts.length}`);

// ── Mini HTTP server con CORS ─────────────────────────────────────────────────
const payload = JSON.stringify(contacts);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/contacts') {
    res.end(payload);
  } else {
    res.writeHead(404); res.end('{}');
  }
});

// Comando per console browser — usa IndexedDB (nessun limite di quota)
const browserCmd = `fetch('http://localhost:${PORT}/contacts').then(function(r){return r.json()}).then(function(newC){var DB='next-move-db',STORE='zustand',KEY='next-move-storage';var req=indexedDB.open(DB,1);req.onupgradeneeded=function(){req.result.createObjectStore(STORE)};req.onsuccess=function(){var db=req.result;var tx=db.transaction(STORE,'readonly');var gr=tx.objectStore(STORE).get(KEY);gr.onsuccess=function(){var raw=gr.result;var st=raw?JSON.parse(raw):{state:{contacts:{}}};var ex=st.state.contacts||{};var existNames=new Set(Object.values(ex).map(function(c){return(c.company||'').toLowerCase().trim()}));var added=0;newC.forEach(function(c){if(!existNames.has((c.company||'').toLowerCase().trim())){ex[c.id]=c;added++;}});st.state.contacts=ex;var tx2=db.transaction(STORE,'readwrite');tx2.objectStore(STORE).put(JSON.stringify(st),KEY);tx2.oncomplete=function(){console.log('Importati '+added+' prospect su '+newC.length+'. Ricarica con F5.')};}}}).catch(function(e){console.error('Errore:',e)});`;

server.listen(PORT, () => {
  console.log(`\n✅ Server attivo su http://localhost:${PORT}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 INCOLLA QUESTO COMANDO NELLA CONSOLE DEL BROWSER (F12):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(browserCmd);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nPremi Ctrl+C per fermare il server dopo l\'import.\n');
});
