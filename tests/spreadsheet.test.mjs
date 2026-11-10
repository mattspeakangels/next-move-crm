// Lettura e scrittura dei fogli di calcolo con la libreria SheetJS distribuita da
// cdn.sheetjs.com: le stesse operazioni usate da storico, clienti, prodotti e profilazione.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as RAW from 'xlsx';

const XLSX = await import('../src/lib/spreadsheet.ts');

const rows = [
  ['Cliente', 'Item ID', 'Data', 'Importo'],
  ['Rossi Srl', 'TEST-1', new Date(Date.UTC(2026, 9, 1)), 125.5],
  ['Bianchi & C.', 'TEST-2', new Date(Date.UTC(2026, 10, 9)), 80],
];

function workbook() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), 'Storico');
  return wb;
}

test('la versione installata è quella di SheetJS, non la 0.18.5 di npm', () => {
  const [major, minor] = RAW.version.split('.').map(Number);
  assert.ok(major > 0 || minor >= 20, `versione ${RAW.version}`);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.dependencies.xlsx, /^https:\/\/cdn\.sheetjs\.com\//);
});

for (const bookType of ['xlsx', 'xls']) {
  test(`un file .${bookType} si rilegge per righe (import storico)`, () => {
    const buf = RAW.write(workbook(), { type: 'array', bookType });
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    assert.deepEqual(wb.SheetNames, ['Storico']);
    const out = XLSX.utils.sheet_to_json(wb.Sheets.Storico, { header: 1, defval: '' });
    assert.deepEqual(out[0], rows[0]);
    assert.equal(out[1][0], 'Rossi Srl');
    assert.ok(out[1][2] instanceof Date);
    assert.equal(out[1][2].toISOString().slice(0, 10), '2026-10-01');
    assert.equal(out[1][3], 125.5);
  });

  test(`un file .${bookType} si converte in CSV (import clienti, prodotti, analisi)`, () => {
    const buf = RAW.write(workbook(), { type: 'array', bookType });
    const wb = XLSX.read(buf, { type: 'array' });
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    const lines = csv.trim().split('\n');
    assert.equal(lines.length, 3);
    assert.equal(lines[0], 'Cliente,Item ID,Data,Importo');
    assert.match(lines[2], /^Bianchi & C\.,TEST-2,/);
  });
}

test('un CSV si legge come foglio', () => {
  const csv = 'Cliente,Importo\nRossi Srl,125.5\n';
  const wb = XLSX.read(new TextEncoder().encode(csv), { type: 'array' });
  const out = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  assert.deepEqual(out, [['Cliente', 'Importo'], ['Rossi Srl', 125.5]]);
});

test('le funzioni usate dall\'export della profilazione esistono', () => {
  assert.equal(typeof XLSX.writeFile, 'function');
  const ws = XLSX.utils.aoa_to_sheet([['Scheda'], ['Valore']]);
  ws['!cols'] = [{ wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Scheda Dealer');
  const back = XLSX.read(RAW.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
  assert.deepEqual(back.SheetNames, ['Scheda Dealer']);
});
