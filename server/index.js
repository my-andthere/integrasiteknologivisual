import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, parseJson, checkConnection } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Static site (public/) ----
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// ---- API ----
app.get('/api/health', async (_req, res) => {
  try {
    const info = await checkConnection();
    res.json({ ok: true, database: info, time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.get('/api/services', async (_req, res, next) => {
  try {
    const rows = await query(
      'SELECT slug, title, icon, short_desc, features FROM services WHERE is_active = 1 ORDER BY sort_order, id'
    );
    res.json(
      rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        icon: r.icon,
        description: r.short_desc,
        features: parseJson(r.features)
      }))
    );
  } catch (e) { next(e); }
});

app.get('/api/products', async (_req, res, next) => {
  try {
    const rows = await query(
      'SELECT slug, title, description, features, sector FROM products WHERE is_active = 1 ORDER BY sort_order, id'
    );
    res.json(
      rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        description: r.description,
        sector: r.sector,
        features: parseJson(r.features)
      }))
    );
  } catch (e) { next(e); }
});

app.get('/api/sectors', async (_req, res, next) => {
  try {
    const rows = await query(
      'SELECT slug, title, description, tags FROM sectors WHERE is_active = 1 ORDER BY sort_order, id'
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/stats', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT
         (SELECT COUNT(*) FROM services WHERE is_active = 1) AS services,
         (SELECT COUNT(*) FROM products  WHERE is_active = 1) AS products,
         (SELECT COUNT(*) FROM sectors  WHERE is_active = 1) AS sectors,
         (SELECT COUNT(*) FROM leads)                    AS leads`
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// Simpan permintaan konsultasi dari form website
app.post('/api/leads', async (req, res, next) => {
  try {
    const { full_name, company, email, phone, sector, service, message } = req.body || {};
    if (!full_name || !email || !phone) {
      return res.status(422).json({ ok: false, error: 'name, email, dan phone wajib diisi' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(422).json({ ok: false, error: 'format email tidak valid' });
    }
    const result = await query(
      `INSERT INTO leads (full_name, company, email, phone, sector, service, message, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'website')`,
      [
        String(full_name).slice(0, 120),
        company ? String(company).slice(0, 160) : null,
        String(email).slice(0, 160),
        String(phone).slice(0, 40),
        sector ? String(sector).slice(0, 80) : null,
        service ? String(service).slice(0, 80) : null,
        message ? String(message).slice(0, 4000) : null
      ]
    );
    res.status(201).json({ ok: true, id: result.insertId, message: 'Permintaan konsultasi tersimpan' });
  } catch (e) { next(e); }
});

// Daftar lead (ringkas, untuk admin internal)
app.get('/api/leads', async (_req, res, next) => {
  try {
    const rows = await query(
      'SELECT id, full_name, company, email, phone, sector, service, status, created_at FROM leads ORDER BY id DESC LIMIT 100'
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error('[api-error]', err);
  res.status(500).json({ ok: false, error: 'terjadi kesalahan pada server' });
});

app.listen(PORT, HOST, async () => {
  console.log(`▶ PT. Integration Teknologi Visual — server berjalan di http://${HOST}:${PORT}`);
  try {
    const info = await checkConnection();
    console.log(`▶ Database terhubung: ${info.db} (${info.version})`);
  } catch (err) {
    console.warn('▶ PERINGATAN: database belum terhubung —', err.message);
  }
});
