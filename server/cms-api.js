/**
 * API Portal CMS — analisis pengunjung, artikel, konfigurasi SEO & branding.
 *
 * Routing:
 *   /api/admin/*  -> butuh session CMS (Authorization: Bearer <token>)
 *   /api/cms/*    -> publik (konten yang dirender di website)
 */
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, parseJson } from './db.js';
import { login, logout, requireAuth, resolveSession, visitorFingerprint } from './auth.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'banners');
const IMG_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' };

const slugify = (text, fallback = 'artikel') =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180) || fallback;

const UA_BROWSERS = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Chrome\//, 'Chrome'],
  [/Firefox\//, 'Firefox'],
  [/Safari\//, 'Safari'],
  [/curl|wget|bot|spider/i, 'Bot']
];
const UA_OS = [
  [/Windows NT/i, 'Windows'],
  [/Android/i, 'Android'],
  [/iPhone|iPad|iOS/i, 'iOS'],
  [/Mac OS X/i, 'macOS'],
  [/Linux/i, 'Linux']
];

function detectBrowser(ua = '') {
  for (const [re, name] of UA_BROWSERS) if (re.test(ua)) return name;
  return 'Other';
}
function detectOs(ua = '') {
  for (const [re, name] of UA_OS) if (re.test(ua)) return name;
  return 'Other';
}
function detectDevice(ua = '') {
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile';
  if (/Tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}
function hostOf(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/* =========================================================
   AUTH
   ========================================================= */
router.post('/admin/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const result = await login(username, password, req);
    if (!result.ok) return res.status(401).json(result);
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/admin/logout', async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    await logout(token);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/admin/me', async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : req.query.token;
    const session = await resolveSession(token);
    if (!session) return res.status(401).json({ ok: false, error: 'belum login' });
    res.json({ ok: true, user: session });
  } catch (e) { next(e); }
});

// Semua route di bawah ini dilindungi session CMS
router.use('/admin', requireAuth);

/* =========================================================
   DASHBOARD & ANALITIK PENGUNJUNG
   ========================================================= */
router.get('/admin/dashboard', async (_req, res, next) => {
  try {
    const summary = await query(
      `SELECT
        (SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL 30 DAY) AS pv_30d,
        (SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE created_at >= NOW() - INTERVAL 30 DAY) AS visitors_30d,
        (SELECT COUNT(*) FROM page_views WHERE created_at >= CURDATE()) AS pv_today,
        (SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE created_at >= CURDATE()) AS visitors_today,
        (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL 30 DAY) AS leads_30d,
        (SELECT COUNT(*) FROM leads WHERE status = 'new') AS leads_new,
        (SELECT COUNT(*) FROM articles WHERE status = 'published') AS articles_published,
        (SELECT COUNT(*) FROM articles) AS articles_total,
        (SELECT COUNT(*) FROM keywords) AS keywords_total,
        (SELECT COUNT(*) FROM clients) AS clients_total,
        (SELECT COUNT(*) FROM partners) AS partners_total,
        (SELECT COUNT(*) FROM banners) AS banners_total,
        (SELECT AVG(duration) FROM page_views WHERE created_at >= NOW() - INTERVAL 30 DAY) AS avg_duration,
        (SELECT COUNT(*) FROM analytics_events WHERE created_at >= NOW() - INTERVAL 30 DAY) AS events_30d`
    );

    const trend = await query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
       FROM page_views WHERE created_at >= NOW() - INTERVAL 30 DAY
       GROUP BY DATE(created_at) ORDER BY day`
    );

    const topPages = await query(
      `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
       FROM page_views WHERE created_at >= NOW() - INTERVAL 30 DAY
       GROUP BY path ORDER BY views DESC LIMIT 10`
    );

    const referrers = await query(
      `SELECT referrer_host AS source, COUNT(*) AS views
       FROM page_views WHERE created_at >= NOW() - INTERVAL 30 DAY AND referrer_host IS NOT NULL
       GROUP BY referrer_host ORDER BY views DESC LIMIT 10`
    );

    const devices = await query(
      `SELECT device, COUNT(*) AS views FROM page_views WHERE created_at >= NOW() - INTERVAL 30 DAY
       GROUP BY device ORDER BY views DESC`
    );

    const browsers = await query(
      `SELECT browser, COUNT(*) AS views FROM page_views WHERE created_at >= NOW() - INTERVAL 30 DAY
       GROUP BY browser ORDER BY views DESC LIMIT 6`
    );

    const leadsTrend = await query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS leads FROM leads
       WHERE created_at >= NOW() - INTERVAL 30 DAY GROUP BY DATE(created_at) ORDER BY day`
    );

    const topArticles = await query(
      `SELECT slug, title, views FROM articles WHERE status = 'published'
       ORDER BY views DESC LIMIT 5`
    );

    const events = await query(
      `SELECT event_name, COUNT(*) AS total FROM analytics_events
       WHERE created_at >= NOW() - INTERVAL 30 DAY
       GROUP BY event_name ORDER BY total DESC LIMIT 10`
    );

    res.json({
      ok: true,
      summary: summary[0],
      trend,
      topPages,
      referrers,
      devices,
      browsers,
      leadsTrend,
      topArticles,
      events
    });
  } catch (e) { next(e); }
});

// Rekap(words) traffic per halaman dengan rentang tanggal自定义
router.get('/admin/analytics/pages', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const rows = await query(
      `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors,
              AVG(duration) AS avg_duration
       FROM page_views WHERE created_at >= NOW() - INTERVAL ${days} DAY
       GROUP BY path ORDER BY views DESC LIMIT 100`,
      []
    );
    res.json({ ok: true, rows });
  } catch (e) { next(e); }
});

router.get('/admin/analytics/timeseries', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const rows = await query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
              HOUR(created_at) AS hour,
              COUNT(*) AS views,
              COUNT(DISTINCT visitor_id) AS visitors
       FROM page_views WHERE created_at >= NOW() - INTERVAL ${days} DAY
       GROUP BY day, hour ORDER BY day, hour`
    );
    res.json({ ok: true, rows });
  } catch (e) { next(e); }
});

/* =========================================================
   ARTIKEL (CRUD)
   ========================================================= */
router.get('/admin/articles', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, slug, title, excerpt, category, status, views, author, tags,
              seo_title, seo_description, focus_keyword, published_at, created_at, updated_at
       FROM articles ORDER BY updated_at DESC`
    );
    res.json({ ok: true, articles: rows.map((r) => ({ ...r, tags: parseJson(r.tags, []) })) });
  } catch (e) { next(e); }
});

router.get('/admin/articles/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM articles WHERE id = ? LIMIT 1', [req.params.id]);
    const article = rows[0];
    if (!article) return res.status(404).json({ ok: false, error: 'artikel tidak ditemukan' });
    const keywords = await query(
      `SELECT k.id, k.keyword FROM article_keywords ak JOIN keywords k ON k.id = ak.keyword_id
       WHERE ak.article_id = ?`,
      [article.id]
    );
    res.json({ ok: true, article: { ...article, tags: parseJson(article.tags, []), keywords } });
  } catch (e) { next(e); }
});

async function saveArticle(req, res, next, articleId = null) {
  try {
    const b = req.body || {};
    const title = String(b.title || '').trim();
    if (!title) return res.status(422).json({ ok: false, error: 'judul artikel wajib diisi' });

    let slug = slugify(b.slug || title);
    const clash = await query('SELECT id FROM articles WHERE slug = ? AND id <> ?', [slug, articleId || 0]);
    if (clash.length) slug = `${slug}-${Date.now().toString(36)}`;

    const status = ['draft', 'published', 'archived'].includes(b.status) ? b.status : 'draft';
    const tags = JSON.stringify(
      Array.isArray(b.tags)
        ? b.tags
        : String(b.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
    );

    const fields = {
      slug,
      title,
      excerpt: b.excerpt ? String(b.excerpt).slice(0, 1000) : null,
      content: String(b.content || ''),
      cover_image: b.cover_image ? String(b.cover_image).slice(0, 400) : null,
      category: b.category ? String(b.category).slice(0, 80) : null,
      tags,
      author: b.author ? String(b.author).slice(0, 120) : (req.session?.full_name || 'Admin'),
      status,
      seo_title: b.seo_title ? String(b.seo_title).slice(0, 220) : null,
      seo_description: b.seo_description ? String(b.seo_description).slice(0, 320) : null,
      focus_keyword: b.focus_keyword ? String(b.focus_keyword).slice(0, 160) : null,
      published_at: status === 'published' ? (b.published_at || new Date()) : b.published_at || null
    };

    let id = articleId;
    if (articleId) {
      await query(
        `UPDATE articles SET slug=?, title=?, excerpt=?, content=?, cover_image=?, category=?, tags=?,
          author=?, status=?, seo_title=?, seo_description=?, focus_keyword=?, published_at=?
         WHERE id = ?`,
        [
          fields.slug, fields.title, fields.excerpt, fields.content, fields.cover_image, fields.category,
          fields.tags, fields.author, fields.status, fields.seo_title, fields.seo_description,
          fields.focus_keyword, fields.published_at, articleId
        ]
      );
    } else {
      const result = await query(
        `INSERT INTO articles (slug, title, excerpt, content, cover_image, category, tags, author, status,
           seo_title, seo_description, focus_keyword, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fields.slug, fields.title, fields.excerpt, fields.content, fields.cover_image, fields.category,
          fields.tags, fields.author, fields.status, fields.seo_title, fields.seo_description,
          fields.focus_keyword, fields.published_at
        ]
      );
      id = result.insertId;
    }

    // Sinkronkan relasi kata kunci
    if (Array.isArray(b.keywords)) {
      await query('DELETE FROM article_keywords WHERE article_id = ?', [id]);
      for (const kw of b.keywords) {
        const key = String(kw.keyword || kw).trim();
        if (!key) continue;
        const rows = await query('SELECT id FROM keywords WHERE keyword = ? LIMIT 1', [key]);
        let keywordId = rows[0]?.id;
        if (!keywordId) {
          const ins = await query('INSERT INTO keywords (keyword) VALUES (?)', [key]);
          keywordId = ins.insertId;
        }
        await query('INSERT IGNORE INTO article_keywords (article_id, keyword_id) VALUES (?, ?)', [id, keywordId]);
      }
    }

    res.json({ ok: true, id, slug: fields.slug, message: articleId ? 'Artikel diperbarui' : 'Artikel dibuat' });
  } catch (e) { next(e); }
}

router.post('/admin/articles', (req, res, next) => saveArticle(req, res, next, null));
router.put('/admin/articles/:id', (req, res, next) => saveArticle(req, res, next, Number(req.params.id)));

router.delete('/admin/articles/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ ok: true, message: 'Artikel dihapus' });
  } catch (e) { next(e); }
});

/* =========================================================
   KLIEN & MITRA (CRUD)
   ========================================================= */
const CLIENT_SEGMENTS = [
  'Retail', 'Manufacturing', 'Financial Services', 'Government', 'Healthcare',
  'Logistics', 'Hospitality', 'Education', 'Telco', 'Energy'
];
const PARTNER_CATEGORIES = [
  'Hardware', 'Infrastructure', 'Fintech', 'Software', 'Partnership', 'Delivery', 'Operations', 'Service'
];

function uniqueSlug(rows, candidate, ignoreId = 0, fallback = 'klien') {
  let slug = slugify(candidate, fallback);
  const taken = rows.some((r) => r.slug === slug && Number(r.id) !== Number(ignoreId));
  if (!taken) return slug;
  let i = 2;
  while (rows.some((r) => r.slug === `${slug}-${i}` && Number(r.id) !== Number(ignoreId))) i += 1;
  return `${slug}-${i}`;
}

router.get('/admin/clients', async (_req, res, next) => {
  try {
    const clients = await query(
      `SELECT id, slug, name, segment, initials, sort_order, is_active
       FROM clients ORDER BY sort_order, id`
    );
    res.json({ ok: true, clients, segments: CLIENT_SEGMENTS });
  } catch (e) { next(e); }
});

async function saveClient(req, res, next, clientId = null) {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    if (!name) return res.status(422).json({ ok: false, error: 'nama klien wajib diisi' });

    const all = await query('SELECT id, slug FROM clients');
    const slug = uniqueSlug(all, b.slug || name, clientId || 0, 'klien');
    const segment = String(b.segment || 'Lainnya').trim().slice(0, 80);
    const initials = String(b.initials || name.slice(0, 2)).trim().toUpperCase().slice(0, 8) || 'ITV';
    const sortOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
    const isActive = b.is_active === false || b.is_active === 0 || b.is_active === '0' ? 0 : 1;

    if (clientId) {
      await query(
        `UPDATE clients SET slug=?, name=?, segment=?, initials=?, sort_order=?, is_active=? WHERE id=?`,
        [slug, name.slice(0, 160), segment, initials, sortOrder, isActive, clientId]
      );
      return res.json({ ok: true, id: clientId, message: 'Klien diperbarui' });
    }
    const result = await query(
      `INSERT INTO clients (slug, name, segment, initials, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
      [slug, name.slice(0, 160), segment, initials, sortOrder, isActive]
    );
    res.json({ ok: true, id: result.insertId, message: 'Klien dibuat' });
  } catch (e) { next(e); }
}

router.post('/admin/clients', (req, res, next) => saveClient(req, res, next, null));
router.put('/admin/clients/:id', (req, res, next) => saveClient(req, res, next, Number(req.params.id)));

router.delete('/admin/clients/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ ok: true, message: 'Klien dihapus' });
  } catch (e) { next(e); }
});

router.get('/admin/partners', async (_req, res, next) => {
  try {
    const partners = await query(
      `SELECT id, slug, name, category, description, initials, sort_order, is_active
       FROM partners ORDER BY sort_order, id`
    );
    res.json({ ok: true, partners, categories: PARTNER_CATEGORIES });
  } catch (e) { next(e); }
});

async function savePartner(req, res, next, partnerId = null) {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    if (!name) return res.status(422).json({ ok: false, error: 'nama mitra wajib diisi' });

    const all = await query('SELECT id, slug FROM partners');
    const slug = uniqueSlug(all, b.slug || name, partnerId || 0, 'mitra');
    const category = String(b.category || 'Software').trim().slice(0, 80);
    const description = b.description ? String(b.description).trim().slice(0, 255) : null;
    const initials = String(b.initials || name.slice(0, 2)).trim().toUpperCase().slice(0, 8) || 'PR';
    const sortOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
    const isActive = b.is_active === false || b.is_active === 0 || b.is_active === '0' ? 0 : 1;

    if (partnerId) {
      await query(
        `UPDATE partners SET slug=?, name=?, category=?, description=?, initials=?, sort_order=?, is_active=? WHERE id=?`,
        [slug, name.slice(0, 160), category, description, initials, sortOrder, isActive, partnerId]
      );
      return res.json({ ok: true, id: partnerId, message: 'Mitra diperbarui' });
    }
    const result = await query(
      `INSERT INTO partners (slug, name, category, description, initials, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slug, name.slice(0, 160), category, description, initials, sortOrder, isActive]
    );
    res.json({ ok: true, id: result.insertId, message: 'Mitra dibuat' });
  } catch (e) { next(e); }
}

router.post('/admin/partners', (req, res, next) => savePartner(req, res, next, null));
router.put('/admin/partners/:id', (req, res, next) => savePartner(req, res, next, Number(req.params.id)));

router.delete('/admin/partners/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM partners WHERE id = ?', [req.params.id]);
    res.json({ ok: true, message: 'Mitra dihapus' });
  } catch (e) { next(e); }
});

/* =========================================================
   BANNER SLIDESHOW (CRUD)
   ========================================================= */

/** Parse daftar chip: array atau "A, B, C" -> ["A","B","C"] */
function parseChips(value) {
  if (Array.isArray(value)) {
    return value.map((c) => String(c).trim()).filter(Boolean).slice(0, 12);
  }
  return String(value || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Parse badge dari:
 *  - array object: [{ v, l }]
 *  - teks multiline: "Nilai|Label" per baris
 */
function parseBadges(value) {
  let list = [];
  if (Array.isArray(value)) {
    list = value
      .map((b) => ({ v: String(b?.v ?? '').trim(), l: String(b?.l ?? '').trim() }))
      .filter((b) => b.v || b.l);
  } else {
    list = String(value || '')
      .split(/\r?\n/)
      .map((line) => line.split('|'))
      .map(([v, l]) => ({ v: String(v || '').trim(), l: String(l || '').trim() }))
      .filter((b) => b.v || b.l);
  }
  return list.slice(0, 8);
}

router.get('/admin/banners', async (_req, res, next) => {
  try {
    const banners = await query(
      `SELECT id, slug, title, title_highlight, eyebrow, description,
              cta_label, cta_url, cta2_label, cta2_url, accent,
              visual_title, visual_label, visual_caption, chips, badges, sort_order, is_active,
              image_url, image_alt, show_caption
       FROM banners ORDER BY sort_order, id`
    );
    res.json({
      ok: true,
      banners: banners.map((b) => ({
        ...b,
        chips: parseChips(b.chips),
        badges: parseJson(b.badges, [])
      }))
    });
  } catch (e) { next(e); }
});

async function saveBanner(req, res, next, bannerId = null) {
  try {
    const b = req.body || {};
    const title = String(b.title || '').trim();
    if (!title) return res.status(422).json({ ok: false, error: 'judul slide wajib diisi' });

    const all = await query('SELECT id, slug FROM banners');
    const slug = uniqueSlug(all, b.slug || title, bannerId || 0, 'slide');

    const titleHighlight = b.title_highlight ? String(b.title_highlight).trim().slice(0, 180) : null;
    const eyebrow = b.eyebrow ? String(b.eyebrow).trim().slice(0, 120) : null;
    const description = b.description ? String(b.description).trim().slice(0, 2000) : null;
    const ctaLabel = b.cta_label ? String(b.cta_label).trim().slice(0, 80) : null;
    const ctaUrl = b.cta_url ? String(b.cta_url).trim().slice(0, 255) : null;
    const cta2Label = b.cta2_label ? String(b.cta2_label).trim().slice(0, 80) : null;
    const cta2Url = b.cta2_url ? String(b.cta2_url).trim().slice(0, 255) : null;
    const accent = b.accent ? String(b.accent).trim().slice(0, 60) : null;
    const visualTitle = b.visual_title ? String(b.visual_title).trim().slice(0, 120) : null;
    const visualLabel = b.visual_label ? String(b.visual_label).trim().slice(0, 120) : null;
    const visualCaption = b.visual_caption ? String(b.visual_caption).trim().slice(0, 180) : null;
    const chips = parseChips(b.chips).join(',').slice(0, 500) || null;
    const badges = JSON.stringify(parseBadges(b.badges)).slice(0, 4000);
    const imageUrl = b.image_url ? String(b.image_url).trim().slice(0, 500) : null;
    const imageAlt = b.image_alt ? String(b.image_alt).trim().slice(0, 180) : null;
    const showCaption = b.show_caption === false || b.show_caption === 0 || b.show_caption === '0' ? 0 : 1;
    const sortOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
    const isActive = b.is_active === false || b.is_active === 0 || b.is_active === '0' ? 0 : 1;

    const values = [
      slug, title.slice(0, 180), titleHighlight, eyebrow, description,
      ctaLabel, ctaUrl, cta2Label, cta2Url, accent,
      visualTitle, visualLabel, visualCaption, chips, badges, sortOrder, isActive,
      imageUrl, imageAlt, showCaption
    ];

    if (bannerId) {
      await query(
        `UPDATE banners SET slug=?, title=?, title_highlight=?, eyebrow=?, description=?,
                cta_label=?, cta_url=?, cta2_label=?, cta2_url=?, accent=?,
                visual_title=?, visual_label=?, visual_caption=?, chips=?, badges=?,
                sort_order=?, is_active=?, image_url=?, image_alt=?, show_caption=? WHERE id=?`,
        [...values, bannerId]
      );
      return res.json({ ok: true, id: bannerId, message: 'Slide banner diperbarui' });
    }

    const result = await query(
      `INSERT INTO banners
        (slug, title, title_highlight, eyebrow, description, cta_label, cta_url,
         cta2_label, cta2_url, accent, visual_title, visual_label, visual_caption,
         chips, badges, sort_order, is_active, image_url, image_alt, show_caption)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );
    res.json({ ok: true, id: result.insertId, message: 'Slide banner dibuat' });
  } catch (e) { next(e); }
}

router.post('/admin/banners/upload', async (req, res, next) => {
  try {
    const { filename, dataUrl } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(422).json({ ok: false, error: 'data gambar wajib diisi' });
    }
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!m) return res.status(422).json({ ok: false, error: 'format gambar tidak valid' });
    const mime = m[1].toLowerCase();
    const ext = IMG_EXT[mime];
    if (!ext) return res.status(422).json({ ok: false, error: 'tipe gambar tidak didukung (png/jpg/webp/gif/svg)' });

    const buffer = Buffer.from(m[2], 'base64');
    if (!buffer.length) return res.status(422).json({ ok: false, error: 'gambar kosong' });
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'ukuran gambar maksimal 5MB' });
    }

    let base = String(filename || 'banner')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'banner';

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const stamp = Date.now().toString(36);
    const fileName = `${base}-${stamp}${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, fileName), buffer);

    res.json({ ok: true, url: `/uploads/banners/${fileName}`, message: 'Gambar banner diunggah' });
  } catch (e) { next(e); }
});

router.post('/admin/banners', (req, res, next) => saveBanner(req, res, next, null));
router.put('/admin/banners/:id', (req, res, next) => saveBanner(req, res, next, Number(req.params.id)));

router.delete('/admin/banners/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM banners WHERE id = ?', [req.params.id]);
    res.json({ ok: true, message: 'Slide banner dihapus' });
  } catch (e) { next(e); }
});

/* =========================================================
   KONFIGURASI SEO & BRANDING
   ========================================================= */
router.get('/admin/settings', async (req, res, next) => {
  try {
    const group = req.query.group;
    const rows = group
      ? await query('SELECT * FROM site_settings WHERE setting_group = ? ORDER BY setting_group, setting_key', [group])
      : await query('SELECT * FROM site_settings ORDER BY setting_group, setting_key');
    const grouped = {};
    rows.forEach((r) => {
      grouped[r.setting_group] = grouped[r.setting_group] || {};
      grouped[r.setting_group][r.setting_key] = r.setting_value;
    });
    res.json({ ok: true, groups: grouped, raw: rows });
  } catch (e) { next(e); }
});

router.put('/admin/settings', async (req, res, next) => {
  try {
    const payload = req.body || {};
    // Prefix "brand." dipetakan ke group "branding" agar konsisten dengan seed.
    const groupOf = (key) => (String(key).startsWith('brand.') ? 'branding' : String(key).split('.')[0]);
    const entries = Array.isArray(payload)
      ? payload
      : Object.entries(payload).map(([key, value]) => ({ key, value, group: groupOf(key) }));

    for (const item of entries) {
      const key = String(item.key || '').slice(0, 80);
      if (!key) continue;
      const value = item.value === null || item.value === undefined ? '' : String(item.value);
      const rawGroup = String(item.group || '').trim();
      const group = (rawGroup && rawGroup !== 'brand' ? rawGroup : groupOf(key)).slice(0, 40);
      await query(
        `INSERT INTO site_settings (setting_key, setting_value, setting_group)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_group = VALUES(setting_group)`,
        [key, value, group]
      );
    }
    res.json({ ok: true, message: 'Pengaturan disimpan' });
  } catch (e) { next(e); }
});

/** Audit SEO: memeriksa kelengkapan meta, keyword, dan struktur konten. */
router.get('/admin/seo/audit', async (_req, res, next) => {
  try {
    const settings = await query("SELECT * FROM site_settings WHERE setting_group = 'seo'");
    const map = {};
    settings.forEach((s) => { map[s.setting_key] = s.setting_value; });

    const articles = await query(
      `SELECT id, slug, title, excerpt, seo_title, seo_description, focus_keyword, content, status
       FROM articles`
    );

    const checks = [];
    const desc = map['seo.meta_description'] || '';
    const title = map['seo.site_title'] || '';
    checks.push({
      name: 'Judul situs',
      ok: title.length >= 30 && title.length <= 70,
      detail: `Panjang ${title.length} karakter (ideal 30–70)`
    });
    checks.push({
      name: 'Meta description',
      ok: desc.length >= 70 && desc.length <= 160,
      detail: `Panjang ${desc.length} karakter (ideal 70–160)`
    });
    checks.push({
      name: 'Open Graph image',
      ok: !!map['seo.og_image'],
      detail: map['seo.og_image'] || 'Belum diatur'
    });
    checks.push({
      name: 'Canonical URL',
      ok: !!map['seo.canonical_base'],
      detail: map['seo.canonical_base'] || 'Belum diatur'
    });
    checks.push({
      name: 'Google Site Verification',
      ok: !!map['seo.google_site_verification'],
      detail: map['seo.google_site_verification'] ? 'Terisi' : 'Belum diisi'
    });
    checks.push({
      name: 'robots.txt & sitemap',
      ok: !!map['seo.robots_txt'] && String(map['seo.sitemap_enabled']) === '1',
      detail: `Sitemap ${String(map['seo.sitemap_enabled']) === '1' ? 'aktif' : 'nonaktif'}`
    });
    checks.push({
      name: 'Schema.org Organization',
      ok: !!map['seo.schema_org'],
      detail: map['seo.schema_org'] ? 'JSON-LD terpasang' : 'Belum ada'
    });

    const articleChecks = articles.map((a) => {
      const content = String(a.content || '');
      const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
      const issues = [];
      if (!a.seo_title) issues.push('meta title kosong');
      if (!a.seo_description) issues.push('meta description kosong');
      if (!a.focus_keyword) issues.push('focus keyword kosong');
      if (wordCount < 300) issues.push(`isi hanya ${wordCount} kata`);
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        status: a.status,
        wordCount,
        score: Math.max(0, 100 - issues.length * 20),
        issues
      };
    });

    const score = Math.round(
      (checks.filter((c) => c.ok).length / Math.max(checks.length, 1)) * 100
    );

    res.json({ ok: true, score, checks, articles: articleChecks });
  } catch (e) { next(e); }
});

/* =========================================================
   KATA KUNCI
   ========================================================= */
router.get('/admin/keywords', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT k.*,
        (SELECT COUNT(*) FROM article_keywords ak WHERE ak.keyword_id = k.id) AS article_count
       FROM keywords k ORDER BY k.search_volume DESC`
    );
    const history = await query(
      `SELECT keyword_id, DATE_FORMAT(checked_at, '%Y-%m-%d') AS day, position
       FROM keyword_rankings WHERE checked_at >= NOW() - INTERVAL 90 DAY ORDER BY keyword_id, checked_at`
    );
    res.json({ ok: true, keywords: rows, history });
  } catch (e) { next(e); }
});

router.post('/admin/keywords', async (req, res, next) => {
  try {
    const b = req.body || {};
    const keyword = String(b.keyword || '').trim();
    if (!keyword) return res.status(422).json({ ok: false, error: 'kata kunci wajib diisi' });
    const result = await query(
      `INSERT INTO keywords (keyword, search_volume, difficulty, current_rank, target_url, intent, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE search_volume = VALUES(search_volume), difficulty = VALUES(difficulty),
         current_rank = VALUES(current_rank), target_url = VALUES(target_url), intent = VALUES(intent),
         status = VALUES(status), notes = VALUES(notes)`,
      [
        keyword,
        Number(b.search_volume) || 0,
        Number(b.difficulty) || 0,
        b.current_rank ? Number(b.current_rank) : null,
        b.target_url ? String(b.target_url).slice(0, 255) : null,
        b.intent || 'informational',
        b.status || 'tracked',
        b.notes ? String(b.notes).slice(0, 2000) : null
      ]
    );
    res.json({ ok: true, id: result.insertId, message: 'Kata kunci disimpan' });
  } catch (e) { next(e); }
});

router.put('/admin/keywords/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    await query(
      `UPDATE keywords SET keyword = ?, search_volume = ?, difficulty = ?, current_rank = ?,
        target_url = ?, intent = ?, status = ?, notes = ? WHERE id = ?`,
      [
        String(b.keyword || '').trim(),
        Number(b.search_volume) || 0,
        Number(b.difficulty) || 0,
        b.current_rank ? Number(b.current_rank) : null,
        b.target_url ? String(b.target_url).slice(0, 255) : null,
        b.intent || 'informational',
        b.status || 'tracked',
        b.notes ? String(b.notes).slice(0, 2000) : null,
        req.params.id
      ]
    );
    res.json({ ok: true, message: 'Kata kunci diperbarui' });
  } catch (e) { next(e); }
});

router.delete('/admin/keywords/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM keywords WHERE id = ?', [req.params.id]);
    res.json({ ok: true, message: 'Kata kunci dihapus' });
  } catch (e) { next(e); }
});

/** Catat posisi keyword baru untuk riwayat (indikator pergerakan). */
router.post('/admin/keywords/:id/rank', async (req, res, next) => {
  try {
    const position = Number(req.body?.position);
    if (!position || position < 1) return res.status(422).json({ ok: false, error: 'posisi tidak valid' });
    await query('INSERT INTO keyword_rankings (keyword_id, position) VALUES (?, ?)', [req.params.id, position]);
    await query('UPDATE keywords SET current_rank = ? WHERE id = ?', [position, req.params.id]);
    res.json({ ok: true, message: 'Peringkat diperbarui' });
  } catch (e) { next(e); }
});

/* =========================================================
   LEADS (CRM sederhana)
   ========================================================= */
router.get('/admin/leads', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, full_name, company, email, phone, sector, service, message, source, status, created_at
       FROM leads ORDER BY id DESC LIMIT 500`
    );
    res.json({ ok: true, leads: rows });
  } catch (e) { next(e); }
});

router.put('/admin/leads/:id', async (req, res, next) => {
  try {
    const status = String(req.body?.status || 'new');
    await query('UPDATE leads SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ ok: true, message: 'Status lead diperbarui' });
  } catch (e) { next(e); }
});

/* =========================================================
   ENDPOINT PUBLIK (untuk website)
   ========================================================= */
router.get('/cms/settings', async (_req, res, next) => {
  try {
    const rows = await query('SELECT * FROM site_settings ORDER BY setting_group, setting_key');
    const grouped = {};
    rows.forEach((r) => {
      grouped[r.setting_group] = grouped[r.setting_group] || {};
      grouped[r.setting_group][r.setting_key] = r.setting_value;
    });
    res.json({ ok: true, groups: grouped });
  } catch (e) { next(e); }
});

router.get('/cms/articles', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 50);
    const rows = await query(
      `SELECT slug, title, excerpt, cover_image, category, tags, author, published_at, views,
              seo_title, seo_description, focus_keyword
       FROM articles WHERE status = 'published' ORDER BY published_at DESC LIMIT ${limit}`
    );
    res.json({ ok: true, articles: rows.map((r) => ({ ...r, tags: parseJson(r.tags, []) })) });
  } catch (e) { next(e); }
});

router.get('/cms/articles/:slug', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT slug, title, excerpt, content, cover_image, category, tags, author, published_at, views,
              seo_title, seo_description, focus_keyword
       FROM articles WHERE slug = ? AND status = 'published' LIMIT 1`,
      [req.params.slug]
    );
    const article = rows[0];
    if (!article) return res.status(404).json({ ok: false, error: 'artikel tidak ditemukan' });
    await query('UPDATE articles SET views = views + 1 WHERE slug = ?', [req.params.slug]);
    article.views = Number(article.views || 0) + 1;
    res.json({ ok: true, article: { ...article, tags: parseJson(article.tags, []) } });
  } catch (e) { next(e); }
});

/* --- Pelacakan pengunjung --- */
router.post('/cms/track', async (req, res, next) => {
  try {
    const b = req.body || {};
    const ua = req.headers['user-agent'] || '';
    const visitorId = visitorFingerprint(req);

    // Beacon "tutup halaman": perbarui durasi baris pageview yang sama (tanpa menambah baris baru)
    if (b.duration && b.session_id) {
      const upd = await query(
        `UPDATE page_views SET duration = ?
         WHERE visitor_id = ? AND session_id = ? AND path = ?
         ORDER BY id DESC LIMIT 1`,
        [Number(b.duration), visitorId, String(b.session_id).slice(0, 64), String(b.path || '/').slice(0, 255)]
      );
      if (upd && upd.affectedRows > 0) return res.json({ ok: true, updated: true });
    }

    await query(
      `INSERT INTO page_views (path, referrer, referrer_host, visitor_id, session_id, device, browser, os, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(b.path || '/').slice(0, 255),
        b.referrer ? String(b.referrer).slice(0, 400) : null,
        hostOf(b.referrer),
        visitorId,
        b.session_id ? String(b.session_id).slice(0, 64) : null,
        detectDevice(ua),
        detectBrowser(ua),
        detectOs(ua),
        b.duration ? Number(b.duration) : null
      ]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/cms/track-event', async (req, res, next) => {
  try {
    const b = req.body || {};
    const name = String(b.event || b.event_name || '').slice(0, 80);
    if (!name) return res.status(422).json({ ok: false, error: 'nama event wajib diisi' });
    await query(
      'INSERT INTO analytics_events (event_name, path, label, visitor_id, meta) VALUES (?, ?, ?, ?, ?)',
      [
        name,
        b.path ? String(b.path).slice(0, 255) : null,
        b.label ? String(b.label).slice(0, 160) : null,
        visitorFingerprint(req),
        JSON.stringify(b.meta || {})
      ]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
