// Guardia: nel codice dell'app (src/) non devono tornare tipi `any` (Blocco 4).
// Conta i nodi `any` dell'albero TypeScript, quindi ignora commenti e stringhe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) files.push(p);
  }
})('src');

test('nessun tipo any in src/', () => {
  const found = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = node => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) found.push(`${f}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  assert.deepEqual(found, [], `Usa un tipo preciso o unknown al posto di any:\n${found.join('\n')}`);
});
