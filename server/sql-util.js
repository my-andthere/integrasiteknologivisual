import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Buang baris komentar (-- ...) dari skrip SQL. */
export function stripComments(sql) {
  return sql
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
}

/** Pisah statement pada ';' di luar literal string & backtick. */
export function splitStatements(sql) {
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

/**
 * Jalankan satu atau beberapa berkas .sql secara berurutan.
 * Setiap statement dieksekusi pada koneksi pool yang sama.
 */
export async function runSchemaFiles(pool, files, { label = 'skema' } = {}) {
  let total = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(__dirname, file), 'utf8');
    const statements = splitStatements(stripComments(raw));
    for (const stmt of statements) {
      const [result] = await pool.query(stmt);
      /* Statement SELECT verifikasi (schema-i18n.sql) — tampilkan ringkasannya */
      if (Array.isArray(result) && result.length) {
        for (const row of result) console.log('   ', JSON.stringify(row));
      }
    }
    total += statements.length;
    console.log(`✔ ${file} — ${statements.length} statement dieksekusi`);
  }
  console.log(`✔ Total ${total} statement dieksekusi — ${label}.`);
  return total;
}
