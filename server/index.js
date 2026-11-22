import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, parseJson, checkConnection, mapBanner } from './db.js';
import cmsRouter from './cms-api.js';
import { purgeExpiredSessions } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
// Upload gambar (banner/klien/mitra) butuh payload lebih besar (base64) — parser khusus didahulukan.
app.use('/api/admin/banners/upload', express.json({ limit: '8mb' }));
app.use('/api/admin/media/upload', express.json({ limit: '8mb' }));
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
      'SELECT slug, title, icon, short_desc, features, translations FROM services WHERE is_active = 1 ORDER BY sort_order, id'
    );
    res.json(
      rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        icon: r.icon,
        description: r.short_desc,
        features: parseJson(r.features),
        translations: parseJson(r.translations, null)
      }))
    );
  } catch (e) { next(e); }
});

app.get('/api/products', async (_req, res, next) => {
  try {
    const rows = await query(
      'SELECT slug, title, description, features, sector, translations FROM products WHERE is_active = 1 ORDER BY sort_order, id'
    );
    res.json(
      rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        description: r.description,
        sector: r.sector,
        features: parseJson(r.features),
        translations: parseJson(r.translations, null)
      }))
    );
  } catch (e) { next(e); }
});

app.get('/api/sectors', async (_req, res, next) => {
  try {
    const rows = await query(
      'SELECT slug, title, description, tags, translations FROM sectors WHERE is_active = 1 ORDER BY sort_order, id'
    );
    res.json(rows.map((r) => ({ ...r, translations: parseJson(r.translations, null) })));
  } catch (e) { next(e); }
});

app.get('/api/clients', async (_req, res, next) => {
  try {
    const [clients, partners] = await Promise.all([
      query(
        'SELECT slug, name, segment, initials, image_url, image_alt FROM clients WHERE is_active = 1 ORDER BY sort_order, id'
      ),
      query(
        'SELECT slug, name, category, description, initials, image_url, image_alt FROM partners WHERE is_active = 1 ORDER BY sort_order, id'
      )
    ]);
    res.json({ clients, partners });
  } catch (e) { next(e); }
});

/* Lowongan kerja, program magang & PKL */
app.get('/api/jobs', async (req, res, next) => {
  try {
    const type = String(req.query.type || '').trim();
    const where = ['is_active = 1'];
    const args = [];
    if (['lowongan', 'magang', 'pkl'].includes(type)) {
      where.push('type = ?');
      args.push(type);
    }
    const rows = await query(
      `SELECT slug, title, type, department, location, work_mode, employment,
              description, requirements, benefits, translations
         FROM job_openings WHERE ${where.join(' AND ')} ORDER BY sort_order, id`,
      args
    );
    res.json({
      ok: true,
      jobs: rows.map((r) => ({
        ...r,
        requirements: parseJson(r.requirements, []),
        benefits: parseJson(r.benefits, []),
        translations: parseJson(r.translations, null)
      }))
    });
  } catch (e) { next(e); }
});

/* Program Open Partner (kemitraan terbuka) */
app.get('/api/partner-programs', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT slug, title, category, description, benefits, requirements,
              cta_label, cta_url, translations
         FROM partner_programs WHERE is_active = 1 ORDER BY sort_order, id`
    );
    res.json({
      ok: true,
      programs: rows.map((r) => ({
        ...r,
        benefits: parseJson(r.benefits, []),
        requirements: parseJson(r.requirements, []),
        translations: parseJson(r.translations, null)
      }))
    });
  } catch (e) { next(e); }
});

/* Slide banner slideshow hero */
app.get('/api/banners', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, slug, title, title_highlight, eyebrow, description,
              cta_label, cta_url, cta2_label, cta2_url, accent,
                visual_title, visual_label, visual_caption, chips, badges, sort_order,
                image_url, image_alt, show_caption, translations
       FROM banners WHERE is_active = 1 ORDER BY sort_order, id`
    );
    res.json({ slides: rows.map(mapBanner) });
  } catch (e) { next(e); }
});

app.get('/api/stats', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT
         (SELECT COUNT(*) FROM services WHERE is_active = 1) AS services,
         (SELECT COUNT(*) FROM products  WHERE is_active = 1) AS products,
         (SELECT COUNT(*) FROM sectors  WHERE is_active = 1) AS sectors,
         (SELECT COUNT(*) FROM clients  WHERE is_active = 1) AS clients,
         (SELECT COUNT(*) FROM partners WHERE is_active = 1) AS partners,
         (SELECT COUNT(*) FROM banners  WHERE is_active = 1) AS banners,
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

// ---- Portal CMS (analisis, artikel, SEO, branding, kata kunci) ----
app.use('/api', cmsRouter);

// Konfigurasi situs publik (branding + SEO) untuk rendering di website
app.get('/api/site-config', async (_req, res, next) => {
  try {
    const rows = await query('SELECT setting_group, setting_key, setting_value FROM site_settings');
    const out = { branding: {}, seo: {} };
    rows.forEach((r) => {
      const group = r.setting_group === 'branding' ? 'branding' : 'seo';
      out[group][r.setting_key] = r.setting_value;
    });
    res.json(out);
  } catch (e) { next(e); }
});

// Artikel terbit (untuk halaman artikel publik)
app.get('/api/articles', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 50);
    const rows = await query(
      `SELECT slug, title, excerpt, cover_image, category, tags, author, published_at,
              views, translations
       FROM articles WHERE status = 'published' ORDER BY published_at DESC LIMIT ${limit}`
    );
    res.json(rows.map((r) => ({ ...r, tags: parseJson(r.tags, []) })));
  } catch (e) { next(e); }
});

app.get('/api/articles/:slug', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT slug, title, excerpt, content, cover_image, category, tags, author,
              published_at, views, translations
       FROM articles WHERE slug = ? AND status = 'published' LIMIT 1`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'artikel tidak ditemukan' });
    await query('UPDATE articles SET views = views + 1 WHERE slug = ?', [req.params.slug]);
    const article = { ...rows[0], tags: parseJson(rows[0].tags, []) };
    article.views = Number(article.views || 0) + 1;
    res.json(article);
  } catch (e) { next(e); }
});

// Endpoint pelacakan versi ringkas (dipakai website)
app.post('/api/track', async (req, res, next) => {
  req.url = '/cms/track';
  cmsRouter.handle(req, res, next);
});

app.post('/api/track/event', async (req, res, next) => {
  req.url = '/cms/track-event';
  cmsRouter.handle(req, res, next);
});

// ---- robots.txt & sitemap.xml (didorong oleh pengaturan SEO) ----
async function readSeoSetting(key, fallback = '') {
  const rows = await query(
    'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
    [key]
  );
  return rows.length && rows[0].setting_value != null ? String(rows[0].setting_value) : fallback;
}

app.get('/robots.txt', async (_req, res, next) => {
  try {
    const enabled = (await readSeoSetting('seo.sitemap_enabled', '0')).trim();
    if (enabled !== '1' && enabled.toLowerCase() !== 'true') {
      res.type('text/plain').send('User-agent: *\nDisallow: /\n');
      return;
    }
    const body = await readSeoSetting(
      'seo.robots_txt',
      'User-agent: *\nAllow: /\nSitemap: https://www.integrasiteknologivisual.com/sitemap.xml\n'
    );
    res.type('text/plain').send(body);
  } catch (e) { next(e); }
});

app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const enabled = (await readSeoSetting('seo.sitemap_enabled', '0')).trim();
    if (enabled !== '1' && enabled.toLowerCase() !== 'true') {
      res.status(404).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset></urlset>');
      return;
    }
    const base = (await readSeoSetting('seo.canonical_base', 'https://www.integrasiteknologivisual.com')).replace(/\/$/, '');
    const articles = await query(
      "SELECT slug, published_at, updated_at FROM articles WHERE status = 'published' ORDER BY published_at DESC"
    );
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${base}/`, lastmod: today, priority: '1.0' },
      { loc: `${base}/#layanan`, lastmod: today, priority: '0.9' },
      { loc: `${base}/#produk`, lastmod: today, priority: '0.9' },
      { loc: `${base}/#sektor`, lastmod: today, priority: '0.8' },
      { loc: `${base}/#insight`, lastmod: today, priority: '0.8' },
      { loc: `${base}/#kontak`, lastmod: today, priority: '0.7' },
      ...articles.map((a) => ({
        loc: `${base}/artikel.html?slug=${encodeURIComponent(a.slug)}`,
        lastmod: String(a.updated_at || a.published_at || today).slice(0, 10),
        priority: '0.6'
      }))
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  )
  .join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
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
