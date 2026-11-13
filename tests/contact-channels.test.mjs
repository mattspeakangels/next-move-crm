// Test dei link per i canali di contatto alternativi (src/lib/contactChannels.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = await readFile(new URL('../src/lib/contactChannels.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const ch = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);

test('numero WhatsApp: prefisso Italia aggiunto solo se manca', () => {
  assert.equal(ch.toWhatsAppNumber('333 123 4567'), '393331234567');
  assert.equal(ch.toWhatsAppNumber('+39 333-123.4567'), '393331234567');
  assert.equal(ch.toWhatsAppNumber('0039 3331234567'), '393331234567');
  assert.equal(ch.toWhatsAppNumber('393331234567'), '393331234567');
  assert.equal(ch.toWhatsAppNumber('+41 79 123 45 67'), '41791234567');
  assert.equal(ch.toWhatsAppNumber(''), '');
});

test('link dei canali', () => {
  const p = { key: 'm', label: 'Mario', phone: '+39 02 1234', email: ' a+b@x.it ' };
  assert.equal(ch.channelUrl('chiamata', p, 'Acme'), 'tel:+39021234');
  assert.equal(ch.channelUrl('whatsapp', p, 'Acme'), 'https://wa.me/39021234');
  assert.equal(ch.channelUrl('gmail', p, 'Acme'), 'https://mail.google.com/mail/?view=cm&fs=1&to=a%2Bb%40x.it&su=Acme%20-%20');
  assert.equal(ch.channelUrl('email', p, ''), 'mailto:a%2Bb%40x.it?subject=');
});
