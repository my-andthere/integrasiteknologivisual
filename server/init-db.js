import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Buang baris komentar (-- ...)
function stripComments(sql) {
  return sql
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
}

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

/* Skrip schema yang dijalankan berurutan:
   - schema.sql        : tabel inti + seed konten dasar
   - schema-cms.sql   : tabel & seed untuk CMS (artikel, banner, klien, ...)
   - schema-careers.sql: tabel Karier & Open Partner (idempotent, aman diulang)
   - schema-i18n.sql   : kolom `translations` (EN/JA) + seed terjemahan
   Catatan: seluruh berkas di atas bersifat idempotent (CREATE TABLE IF NOT EXISTS,
   INSERT ... ON DUPLICATE / IGNORE, ALTER ... IF NOT EXISTS, UPDATE hanya bila
   kolom translations masih kosong) sehingga aman dijalankan berulang kali. */
const files = ['schema.sql', 'schema-cms.sql', 'schema-careers.sql', 'schema-i18n.sql'];
let total = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const statements = splitStatements(stripComments(raw));
  for (const stmt of statements) {
    const [result] = await pool.query(stmt);
    /* SELECT verifikasi (schema-i18n.sql) — tampilkan ringkasannya */
    if (Array.isArray(result) && result.length) {
      for (const row of result) console.log('   ', JSON.stringify(row));
    }
  }
  total += statements.length;
  console.log(`✔ ${file} — ${statements.length} statement dieksekusi`);
}

console.log(`✔ Total ${total} statement dieksekusi — schema, seed data & CMS siap.`);
await pool.end();
