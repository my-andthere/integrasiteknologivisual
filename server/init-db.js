import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Buang baris komentar (-- ...)
const withoutComments = raw
  .split('\n')
  .filter((line) => !/^\s*--/.test(line))
  .join('\n');

/** Pisah statement pada ';' di luar literal string & backtick. */
function splitStatements(sql) {
  const out = [];
  let buf = '';
  let quote = null;
  for (const ch of sql) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === ';') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const statements = splitStatements(withoutComments);

for (const stmt of statements) {
  await pool.query(stmt);
}
console.log(`✔ ${statements.length} statement dieksekusi — schema & seed data siap.`);
await pool.end();
