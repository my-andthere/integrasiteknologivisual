/**
 * Migrasi ringan untuk database yang SUDAH berisi data (produksi / staging).
 *
 * Hanya menjalankan DDL & pembaruan yang idempotent & non-destruktif:
 *   - schema-careers.sql : tabel Karier & Open Partner + kolom `translations`
 *   - schema-i18n.sql    : kolom `translations` (EN/JA) + seed terjemahan
 *                          (seed hanya mengisi baris yang `translations`-nya kosong)
 *
 * TIDAK menjalankan schema.sql / schema-cms.sql karena keduanya berisi seed
 * yang menimpa logo/banner/klien yang sudah diunggah lewat CMS.
 *
 * Jalankan: npm run db:migrate
 */
import { pool } from './db.js';
import { runSchemaFiles } from './sql-util.js';

const files = ['schema-careers.sql', 'schema-i18n.sql'];

await runSchemaFiles(pool, files, { label: 'migrasi selesai' });
await pool.end();
