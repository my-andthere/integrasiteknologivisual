/**
 * Modul Analisa Indikator.
 *
 * Menghitung skor menyeluruh (0-100) untuk 5 dimensi:
 *   1. SEO          - kelengkapan meta, konfigurasi situs, struktur konten
 *   2. Performa     - kecepatan respons, durasi kunjungan, bounce, depth
 *   3. Konten       - kedalaman, kelengkapan, kesegaran, sebaran kategori
 *   4. Kata Kunci   - cakupan target, posisi, momentum peringkat
 *   5. Engagement   - konversi lead, kedalaman interaksi, retensi
 *
 * Seluruh perhitungan dilakukan on-the-fly terhadap tabel yang sudah ada
 * (tidak memerlukan perubahan skema / migrasi database).
 */
import { query } from './db.js';

/* =========================================================
   HELPER
   ========================================================= */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const round = (v, d = 0) => {
  const m = 10 ** d;
  return Math.round((Number(v) || 0) * m) / m;
};
const wordCountOf = (text) => {
  const t = String(text || '').trim();
  return t ? t.split(/\s+/).length : 0;
};

/** Grade & label deskriptif untuk sebuah skor 0-100. */
export function gradeOf(score) {
  const s = clamp(Number(score) || 0, 0, 100);
  if (s >= 90) return { grade: 'A', label: 'Sangat Baik' };
  if (s >= 75) return { grade: 'B', label: 'Baik' };
  if (s >= 60) return { grade: 'C', label: 'Cukup' };
  if (s >= 40) return { grade: 'D', label: 'Perlu Perbaikan' };
  return { grade: 'E', label: 'Kritis' };
}

/**
 * Satu metrik indikator.
 * @param {string} name    nama metrik
 * @param {*}      value   nilai terukur
 * @param {string} target  target deskriptif
 * @param {'ok'|'warn'|'bad'} status
 * @param {number} score   skor metrik 0-100
 * @param {number} weight  bobot relatif di dalam kategori
 * @param {string} detail  keterangan tambahan
 */
function metric(name, value, target, status, score, weight, detail = '') {
  return { name, value, target, status, score: clamp(Math.round(score), 0, 100), weight, detail };
}

/** Rata-rata berbobot dari daftar metrik sebuah kategori. */
function weightedScore(metrics) {
  const total = metrics.reduce((s, m) => s + (m.weight || 1), 0);
  if (!total) return 0;
  return Math.round(metrics.reduce((s, m) => s + m.score * (m.weight || 1), 0) / total);
}

/** Skor linear: nilai -> 0..100 antara batas bawah & atas (naik = makin baik). */
function scoreUp(value, min, max) {
  if (max <= min) return value >= max ? 100 : 0;
  return clamp(((Number(value) - min) / (max - min)) * 100, 0, 100);
}

/** Skor linear terbalik: nilai kecil = bagus. */
function scoreDown(value, best, worst) {
  if (worst <= best) return value <= best ? 100 : 0;
  return clamp(((worst - Number(value)) / (worst - best)) * 100, 0, 100);
}

/** Probe kecepatan respons endpoint publik (proxy TTFB). */
async function probeLatency(paths) {
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const out = [];
  for (const p of paths) {
    const started = Date.now();
    try {
      const res = await fetch(base + p, { method: 'GET', headers: { accept: 'application/json' } });
      await res.text();
      out.push({ path: p, ms: Date.now() - started, ok: res.ok, status: res.status });
    } catch (e) {
      out.push({ path: p, ms: null, ok: false, status: 0, error: String(e.message || e) });
    }
  }
  return out;
}

/* =========================================================
   SQL BUILDER (interval harus di-inline, bukan parameter)
   ========================================================= */
const interval = (days) => `INTERVAL ${Number(days)} DAY`;

/* =========================================================
   ANALISA INDIKATOR
   ========================================================= */
export async function buildIndicators(days = 30) {
  const D = clamp(parseInt(days, 10) || 30, 1, 365);
  const iv = interval(D);

  /* ---------- 1. SEO ---------- */
  const settings = await query("SELECT * FROM site_settings WHERE setting_group = 'seo'");
  const smap = {};
  settings.forEach((s) => { smap[s.setting_key] = s.setting_value; });

  const siteTitle = smap['seo.site_title'] || '';
  const metaDesc = smap['seo.meta_description'] || '';
  const siteChecks = [
    { name: 'Judul situs', ok: siteTitle.length >= 30 && siteTitle.length <= 70, detail: `${siteTitle.length} karakter (ideal 30-70)` },
    { name: 'Meta description', ok: metaDesc.length >= 70 && metaDesc.length <= 160, detail: `${metaDesc.length} karakter (ideal 70-160)` },
    { name: 'Open Graph image', ok: !!smap['seo.og_image'], detail: smap['seo.og_image'] || 'Belum diatur' },
    { name: 'Canonical URL', ok: !!smap['seo.canonical_base'], detail: smap['seo.canonical_base'] || 'Belum diatur' },
    { name: 'Google Site Verification', ok: !!smap['seo.google_site_verification'], detail: smap['seo.google_site_verification'] ? 'Terisi' : 'Belum diisi' },
    { name: 'robots.txt & sitemap', ok: !!smap['seo.robots_txt'] && String(smap['seo.sitemap_enabled']) === '1', detail: `Sitemap ${String(smap['seo.sitemap_enabled']) === '1' ? 'aktif' : 'nonaktif'}` },
    { name: 'Schema.org Organization', ok: !!smap['seo.schema_org'], detail: smap['seo.schema_org'] ? 'JSON-LD terpasang' : 'Belum ada' }
  ];
  const siteSeoScore = pct(siteChecks.filter((c) => c.ok).length, siteChecks.length);

  const articles = await query(
    `SELECT id, slug, title, excerpt, content, cover_image, category, tags, author, status,
            seo_title, seo_description, focus_keyword, views, published_at, created_at, updated_at
       FROM articles ORDER BY id DESC`
  );

  const published = articles.filter((a) => a.status === 'published');
  const articleSeo = articles.map((a) => {
    const words = wordCountOf(a.content);
    const issues = [];
    const st = String(a.seo_title || '');
    const sd = String(a.seo_description || '');
    const checks = {
      title: st.length >= 30 && st.length <= 70,
      desc: sd.length >= 70 && sd.length <= 160,
      keyword: !!a.focus_keyword,
      length: words >= 300,
      cover: !!a.cover_image,
      excerpt: String(a.excerpt || '').length >= 50
    };
    if (!st) issues.push('meta title kosong');
    else if (!checks.title) issues.push(`meta title ${st.length} karakter (ideal 30-70)`);
    if (!sd) issues.push('meta description kosong');
    else if (!checks.desc) issues.push(`meta description ${sd.length} karakter (ideal 70-160)`);
    if (!a.focus_keyword) issues.push('focus keyword kosong');
    if (words < 300) issues.push(`isi hanya ${words} kata`);
    if (!a.cover_image) issues.push('cover image kosong');
    if (!a.excerpt) issues.push('excerpt kosong');
    if (a.status === 'published' && !a.published_at) issues.push('published tanpa published_at');
    const okCount = Object.values(checks).filter(Boolean).length;
    return {
      id: a.id, slug: a.slug, title: a.title, status: a.status, category: a.category,
      wordCount: words, views: Number(a.views || 0),
      seoTitleLen: st.length, seoDescLen: sd.length,
      focusKeyword: a.focus_keyword || null,
      hasCover: !!a.cover_image, hasExcerpt: !!a.excerpt,
      updatedAt: a.updated_at, publishedAt: a.published_at,
      score: Math.round((okCount / Object.keys(checks).length) * 100),
      issues
    };
  });

  const cnt = (fn) => articleSeo.filter(fn).length;
  const seoTitleOk = cnt((a) => a.seoTitleLen >= 30 && a.seoTitleLen <= 70);
  const seoDescOk = cnt((a) => a.seoDescLen >= 70 && a.seoDescLen <= 160);
  const kwOk = cnt((a) => !!a.focusKeyword);
  const lenOk = cnt((a) => a.wordCount >= 300);

  const seoMetrics = [
    metric('Konfigurasi SEO situs', `${siteChecks.filter((c) => c.ok).length}/${siteChecks.length} lolos`, '7 dari 7 checklist', siteSeoScore >= 80 ? 'ok' : siteSeoScore >= 50 ? 'warn' : 'bad', siteSeoScore, 30, 'Judul, meta description, OG, canonical, sitemap, schema.org'),
    metric('Meta title artikel', `${seoTitleOk}/${articleSeo.length}`, '≥30 & ≤70 karakter', seoTitleOk === articleSeo.length ? 'ok' : pct(seoTitleOk, articleSeo.length) >= 60 ? 'warn' : 'bad', pct(seoTitleOk, articleSeo.length), 20, ''),
    metric('Meta description artikel', `${seoDescOk}/${articleSeo.length}`, '≥70 & ≤160 karakter', seoDescOk === articleSeo.length ? 'ok' : pct(seoDescOk, articleSeo.length) >= 60 ? 'warn' : 'bad', pct(seoDescOk, articleSeo.length), 20, ''),
    metric('Focus keyword artikel', `${kwOk}/${articleSeo.length}`, 'semua artikel terfokus', pct(kwOk, articleSeo.length) >= 80 ? 'ok' : pct(kwOk, articleSeo.length) >= 40 ? 'warn' : 'bad', pct(kwOk, articleSeo.length), 15, ''),
    metric('Panjang konten', `${lenOk}/${articleSeo.length}`, '≥300 kata per artikel', pct(lenOk, articleSeo.length) >= 80 ? 'ok' : pct(lenOk, articleSeo.length) >= 40 ? 'warn' : 'bad', pct(lenOk, articleSeo.length), 15, '')
  ];

  /* ---------- 2. PERFORMA ---------- */
  const perfRows = await query(
    `SELECT COUNT(*) AS views,
            COUNT(DISTINCT visitor_id) AS visitors,
            COUNT(DISTINCT session_id) AS sessions,
            AVG(NULLIF(duration,0)) AS avg_duration,
            SUM(CASE WHEN duration IS NULL OR duration < 5 THEN 1 ELSE 0 END) AS bounces,
            SUM(CASE WHEN duration IS NOT NULL AND duration >= 60 THEN 1 ELSE 0 END) AS engaged
       FROM page_views
      WHERE created_at >= DATE_SUB(NOW(), ${iv})`
  );
  const pv = perfRows[0] || {};
  const views = Number(pv.views || 0);
  const visitors = Number(pv.visitors || 0);
  const sessions = Number(pv.sessions || 0);
  const avgDuration = Math.round(Number(pv.avg_duration || 0));
  const bounces = Number(pv.bounces || 0);
  const engaged = Number(pv.engaged || 0);
  const bounceRate = pct(bounces, views);
  const pagesPerSession = sessions > 0 ? round(views / sessions, 2) : 0;
  const engagementRate = pct(engaged, views);

  const trend = await query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS views,
            COUNT(DISTINCT visitor_id) AS visitors,
            AVG(NULLIF(duration,0)) AS avg_duration
       FROM page_views
      WHERE created_at >= DATE_SUB(NOW(), ${iv})
      GROUP BY DATE(created_at)
      ORDER BY day`
  ).then((rows) => rows.map((r) => ({
    day: r.day, views: Number(r.views || 0), visitors: Number(r.visitors || 0), avgDuration: Math.round(Number(r.avg_duration || 0))
  })));

  const topPages = await query(
    `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors,
            AVG(NULLIF(duration,0)) AS avg_duration
       FROM page_views
      WHERE created_at >= DATE_SUB(NOW(), ${iv})
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10`
  ).then((rows) => rows.map((r) => ({
    path: r.path, views: Number(r.views || 0), visitors: Number(r.visitors || 0), avgDuration: Math.round(Number(r.avg_duration || 0))
  })));

  const slowPages = await query(
    `SELECT path, COUNT(*) AS views, AVG(NULLIF(duration,0)) AS avg_duration
       FROM page_views
      WHERE created_at >= DATE_SUB(NOW(), ${iv})
      GROUP BY path
     HAVING views >= 3 AND avg_duration IS NOT NULL
      ORDER BY avg_duration DESC
      LIMIT 8`
  ).then((rows) => rows.map((r) => ({
    path: r.path, views: Number(r.views || 0), avgDuration: Math.round(Number(r.avg_duration || 0))
  })));

  const devices = await query(
    `SELECT COALESCE(NULLIF(device,''),'Unknown') AS device, COUNT(*) AS views
       FROM page_views
      WHERE created_at >= DATE_SUB(NOW(), ${iv})
      GROUP BY COALESCE(NULLIF(device,''),'Unknown')
      ORDER BY views DESC`
  ).then((rows) => rows.map((r) => ({ label: r.device, value: Number(r.views || 0) })));

  const referrers = await query(
    `SELECT COALESCE(NULLIF(referrer_host,''),'Direct') AS referrer, COUNT(*) AS views
       FROM page_views
      WHERE created_at >= DATE_SUB(NOW(), ${iv})
      GROUP BY COALESCE(NULLIF(referrer_host,''),'Direct')
      ORDER BY views DESC
      LIMIT 10`
  ).then((rows) => rows.map((r) => ({ label: r.referrer, value: Number(r.views || 0) })));

  const probes = await probeLatency(['/api/cms/settings', '/api/cms/articles?limit=6', '/api/cms/services']);
  const okProbes = probes.filter((p) => p.ok && p.ms != null);
  const avgTtfb = okProbes.length ? Math.round(okProbes.reduce((s, p) => s + p.ms, 0) / okProbes.length) : null;
  const maxTtfb = okProbes.length ? Math.max(...okProbes.map((p) => p.ms)) : null;

  const perfMetrics = [
    metric('Respons API (TTFB proxy)', avgTtfb == null ? 'n/a' : `${avgTtfb} ms`, '<300 ms', avgTtfb == null ? 'bad' : avgTtfb < 300 ? 'ok' : avgTtfb < 800 ? 'warn' : 'bad', avgTtfb == null ? 0 : scoreDown(avgTtfb, 150, 1500), 25, okProbes.length ? `terlambat ${maxTtfb} ms` : 'endpoint publik tidak merespons'),
    metric('Durasi kunjungan rata-rata', `${avgDuration} detik`, '≥60 detik', avgDuration >= 60 ? 'ok' : avgDuration >= 30 ? 'warn' : 'bad', scoreUp(avgDuration, 5, 120), 25, 'dari event unload'),
    metric('Bounce rate', `${bounceRate}%`, '≤50%', bounceRate <= 50 ? 'ok' : bounceRate <= 70 ? 'warn' : 'bad', scoreDown(bounceRate, 30, 90), 20, 'kunjungan <5 detik atau tanpa durasi'),
    metric('Kedalaman kunjungan', `${pagesPerSession} halaman/sesi`, '≥1,5 halaman', pagesPerSession >= 1.5 ? 'ok' : pagesPerSession >= 1 ? 'warn' : 'bad', scoreUp(pagesPerSession, 0.5, 3), 15, ''),
    metric('Tingkat keterlibatan', `${engagementRate}%`, '≥40%', engagementRate >= 40 ? 'ok' : engagementRate >= 20 ? 'warn' : 'bad', scoreUp(engagementRate, 5, 70), 15, 'kunjungan >60 detik')
  ];

  /* ---------- 3. KONTEN ---------- */
  const now = new Date();
  const daysSince = (d) => (d ? Math.floor((now - new Date(d)) / 86400000) : null);
  const contentRows = articleSeo.map((a) => ({ ...a, ageDays: daysSince(a.updatedAt || a.publishedAt) }));
  const fresh = contentRows.filter((a) => a.ageDays != null && a.ageDays <= 90);
  const withCover = contentRows.filter((a) => a.hasCover);
  const withExcerpt = contentRows.filter((a) => a.hasExcerpt);
  const avgWords = contentRows.length
    ? Math.round(contentRows.reduce((s, a) => s + a.wordCount, 0) / contentRows.length)
    : 0;
  const categories = {};
  contentRows.forEach((a) => { const c = a.category || 'Tanpa kategori'; categories[c] = (categories[c] || 0) + 1; });
  const categoryList = Object.entries(categories).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const deepWords = contentRows.filter((a) => a.wordCount >= 800).length;

  const contentMetrics = [
    metric('Artikel terbit', published.length, '≥10 artikel', published.length >= 10 ? 'ok' : published.length >= 5 ? 'warn' : 'bad', scoreUp(published.length, 0, 30), 20, `total ${articles.length} artikel`),
    metric('Kedalaman rata-rata', `${avgWords} kata`, '≥800 kata', avgWords >= 800 ? 'ok' : avgWords >= 400 ? 'warn' : 'bad', scoreUp(avgWords, 100, 1500), 25, ''),
    metric('Artikel dalam (≥800 kata)', `${deepWords}/${contentRows.length}`, '≥50% artikel', pct(deepWords, contentRows.length) >= 50 ? 'ok' : pct(deepWords, contentRows.length) >= 25 ? 'warn' : 'bad', pct(deepWords, contentRows.length), 15, ''),
    metric('Kelengkapan visual', `${withCover.length}/${contentRows.length}`, 'semua artikel punya cover', pct(withCover.length, contentRows.length) >= 90 ? 'ok' : pct(withCover.length, contentRows.length) >= 60 ? 'warn' : 'bad', pct(withCover.length, contentRows.length), 15, ''),
    metric('Kelengkapan excerpt', `${withExcerpt.length}/${contentRows.length}`, 'semua artikel punya excerpt', pct(withExcerpt.length, contentRows.length) >= 90 ? 'ok' : pct(withExcerpt.length, contentRows.length) >= 60 ? 'warn' : 'bad', pct(withExcerpt.length, contentRows.length), 10, ''),
    metric('Kesegaran konten', `${fresh.length}/${contentRows.length}`, 'diperbarui ≤90 hari', pct(fresh.length, contentRows.length) >= 70 ? 'ok' : pct(fresh.length, contentRows.length) >= 40 ? 'warn' : 'bad', pct(fresh.length, contentRows.length), 10, ''),
    metric('Sebaran kategori', categoryList.length, '≥5 kategori', categoryList.length >= 5 ? 'ok' : categoryList.length >= 3 ? 'warn' : 'bad', scoreUp(categoryList.length, 1, 8), 5, categoryList.slice(0, 3).map((c) => `${c.label} (${c.value})`).join(', '))
  ];

  /* ---------- 4. KATA KUNCI ---------- */
  const kwAgg = (await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN current_rank IS NOT NULL THEN 1 ELSE 0 END) AS ranked,
            AVG(current_rank) AS avg_rank,
            SUM(CASE WHEN current_rank <= 3 THEN 1 ELSE 0 END) AS top3,
            SUM(CASE WHEN current_rank <= 10 THEN 1 ELSE 0 END) AS top10,
            SUM(CASE WHEN current_rank <= 20 THEN 1 ELSE 0 END) AS top20,
            SUM(CASE WHEN current_rank > 20 AND current_rank IS NOT NULL THEN 1 ELSE 0 END) AS beyond20,
            SUM(search_volume) AS volume,
            AVG(difficulty) AS avg_difficulty
       FROM keywords`
  ))[0] || {};

  const keywords = await query(
    `SELECT id, keyword, search_volume, difficulty, current_rank, target_url, intent, status
       FROM keywords ORDER BY (current_rank IS NULL), current_rank ASC, search_volume DESC`
  ).then((rows) => rows.map((r) => ({
    id: r.id, keyword: r.keyword, searchVolume: Number(r.search_volume || 0),
    difficulty: Number(r.difficulty || 0), currentRank: r.current_rank == null ? null : Number(r.current_rank),
    targetUrl: r.target_url, intent: r.intent, status: r.status
  })));

  const rankHistory = await query(
    `SELECT kr.keyword_id, kr.position, kr.checked_at
       FROM keyword_rankings kr
      ORDER BY kr.keyword_id, kr.checked_at DESC`
  );
  const historyMap = {};
  rankHistory.forEach((r) => {
    const k = r.keyword_id;
    if (!historyMap[k]) historyMap[k] = [];
    historyMap[k].push({ position: Number(r.position), checkedAt: r.checked_at });
  });
  const movers = keywords.map((k) => {
    const h = historyMap[k.id] || [];
    if (h.length < 2) return { ...k, prevRank: null, delta: 0 };
    const prev = h[1].position;
    const last = h[0].position;
    return { ...k, prevRank: prev, delta: prev - last };
  });

  const total = Number(kwAgg.total || 0);
  const ranked = Number(kwAgg.ranked || 0);
  const avgRank = Number(kwAgg.avg_rank || 0);
  const top3 = Number(kwAgg.top3 || 0);
  const top10 = Number(kwAgg.top10 || 0);
  const top20 = Number(kwAgg.top20 || 0);
  const beyond20 = Number(kwAgg.beyond20 || 0);
  const volume = Number(kwAgg.volume || 0);
  const improved = movers.filter((m) => m.delta > 0).length;
  const dropped = movers.filter((m) => m.delta < 0).length;

  const kwMetrics = [
    metric('Kata kunci dilacak', total, '≥10 kata kunci', total >= 10 ? 'ok' : total >= 5 ? 'warn' : 'bad', scoreUp(total, 0, 30), 20, ''),
    metric('Sudah punya posisi', `${ranked}/${total}`, '≥80% terindeks', pct(ranked, total) >= 80 ? 'ok' : pct(ranked, total) >= 50 ? 'warn' : 'bad', pct(ranked, total), 20, ''),
    metric('Posisi 10 teratas', top10, '≥50% keyword', pct(top10, total) >= 50 ? 'ok' : pct(top10, total) >= 25 ? 'warn' : 'bad', pct(top10, total), 20, `top 3: ${top3}, posisi 11-20: ${Math.max(0, top20 - top10)}`),
    metric('Rata-rata posisi', avgRank ? round(avgRank, 1) : 'n/a', '≤15', avgRank === 0 ? 'warn' : avgRank <= 15 ? 'ok' : avgRank <= 30 ? 'warn' : 'bad', avgRank === 0 ? 50 : scoreDown(avgRank, 5, 60), 20, `volume pencarian ${volume.toLocaleString('id-ID')}`),
    metric('Momentum peringkat', `${improved} naik / ${dropped} turun`, 'dominan naik', improved >= dropped ? 'ok' : 'warn', scoreUp(improved - dropped, -3, 3), 20, 'berdasarkan riwayat keyword_rankings')
  ];

  /* ---------- 5. ENGAGEMENT & LEAD ---------- */
  const leadRows = await query(
    `SELECT status, COUNT(*) AS c FROM leads WHERE created_at >= DATE_SUB(NOW(), ${iv}) GROUP BY status`
  ).then((rows) => rows.map((r) => ({ label: r.status, value: Number(r.c || 0) })));
  const leadTotal30 = leadRows.reduce((s, r) => s + r.value, 0);
  const leadsAll = Number((await query('SELECT COUNT(*) AS c FROM leads'))[0]?.c || 0);
  const leadAllByStatus = await query('SELECT status, COUNT(*) AS c FROM leads GROUP BY status')
    .then((rows) => rows.map((r) => ({ label: r.status, value: Number(r.c || 0) })));
  const won = leadAllByStatus.find((s) => s.label === 'won')?.value || 0;

  const eventRows = await query(
    `SELECT event_name, COUNT(*) AS c FROM analytics_events
      WHERE created_at >= DATE_SUB(NOW(), ${iv})
      GROUP BY event_name ORDER BY c DESC`
  ).then((rows) => rows.map((r) => ({ label: r.event_name, value: Number(r.c || 0) })));
  const eventTotal = eventRows.reduce((s, r) => s + r.value, 0);
  const eventUnique = eventRows.length;

  const repeatRows = await query(
    `SELECT COUNT(*) AS total_visitors, SUM(CASE WHEN views > 1 THEN 1 ELSE 0 END) AS returning_visitors
       FROM (SELECT visitor_id, COUNT(*) AS views FROM page_views
              WHERE created_at >= DATE_SUB(NOW(), ${iv}) AND visitor_id IS NOT NULL
              GROUP BY visitor_id) t`
  );
  const totalVisitors = Number(repeatRows[0]?.total_visitors || 0);
  const returning = Number(repeatRows[0]?.returning_visitors || 0);
  const retentionRate = pct(returning, totalVisitors);

  const conversionRate = visitors > 0 ? round((leadTotal30 / visitors) * 100, 2) : 0;
  const winRate = leadsAll > 0 ? pct(won, leadsAll) : 0;

  const engagementMetrics = [
    metric('Lead baru (periode ini)', leadTotal30, '≥5 lead', leadTotal30 >= 5 ? 'ok' : leadTotal30 >= 2 ? 'warn' : 'bad', scoreUp(leadTotal30, 0, 25), 25, `total keseluruhan ${leadsAll} lead`),
    metric('Tingkat konversi', `${conversionRate}%`, '≥2%', conversionRate >= 2 ? 'ok' : conversionRate >= 0.5 ? 'warn' : 'bad', scoreUp(conversionRate, 0, 8), 25, 'lead ÷ pengunjung unik'),
    metric('Event interaksi', eventTotal, '≥30 event', eventTotal >= 30 ? 'ok' : eventTotal >= 10 ? 'warn' : 'bad', scoreUp(eventTotal, 0, 200), 20, `${eventUnique} jenis event`),
    metric('Retensi pengunjung', `${retentionRate}%`, '≥30% kunjungan ulang', retentionRate >= 30 ? 'ok' : retentionRate >= 15 ? 'warn' : 'bad', scoreUp(retentionRate, 0, 60), 15, ''),
    metric('Win rate lead', `${winRate}%`, '≥20%', winRate >= 20 ? 'ok' : winRate >= 10 ? 'warn' : 'bad', scoreUp(winRate, 0, 60), 15, `leadwon ${won} dari ${leadsAll}`)
  ];

  /* ---------- GABUNGKAN ---------- */
  const sections = [
    { key: 'seo', label: 'SEO', icon: 'bi-search', weight: 30, metrics: seoMetrics },
    { key: 'performa', label: 'Performa', icon: 'bi-speedometer', weight: 25, metrics: perfMetrics },
    { key: 'konten', label: 'Konten', icon: 'bi-file-earmark-text', weight: 20, metrics: contentMetrics },
    { key: 'keyword', label: 'Kata Kunci', icon: 'bi-key', weight: 15, metrics: kwMetrics },
    { key: 'engagement', label: 'Engagement & Lead', icon: 'bi-bullseye', weight: 10, metrics: engagementMetrics }
  ].map((s) => {
    const score = weightedScore(s.metrics);
    const g = gradeOf(score);
    return { ...s, score, grade: g.grade, gradeLabel: g.label };
  });

  const overallScore = Math.round(
    sections.reduce((s, x) => s + x.score * x.weight, 0) / sections.reduce((s, x) => s + x.weight, 0)
  );
  const overall = { ...gradeOf(overallScore), score: overallScore };

  /* ---------- PRIORITAS PERBAIKAN ---------- */
  const issues = [];
  const pushIssue = (priority, area, title, detail) => issues.push({ priority, area, title, detail });

  seoMetrics.forEach((m) => {
    if (m.status !== 'ok') pushIssue(m.status === 'bad' ? 'tinggi' : 'sedang', 'SEO', m.name, `${m.value} — target ${m.target}`);
  });
  siteChecks.filter((c) => !c.ok).forEach((c) => pushIssue('sedang', 'SEO', `Konfigurasi: ${c.name}`, c.detail));
  perfMetrics.forEach((m) => {
    if (m.status !== 'ok') pushIssue(m.status === 'bad' ? 'tinggi' : 'sedang', 'Performa', m.name, `${m.value} — target ${m.target}`);
  });
  contentMetrics.forEach((m) => {
    if (m.status !== 'ok') pushIssue(m.status === 'bad' ? 'tinggi' : 'sedang', 'Konten', m.name, `${m.value} — target ${m.target}`);
  });
  kwMetrics.forEach((m) => {
    if (m.status !== 'ok') pushIssue(m.status === 'bad' ? 'tinggi' : 'sedang', 'Kata Kunci', m.name, `${m.value} — target ${m.target}`);
  });
  engagementMetrics.forEach((m) => {
    if (m.status !== 'ok') pushIssue(m.status === 'bad' ? 'tinggi' : 'sedang', 'Engagement', m.name, `${m.value} — target ${m.target}`);
  });
  articleSeo.filter((a) => a.issues.length).slice(0, 20).forEach((a) => {
    pushIssue('sedang', 'Artikel', a.title || a.slug, a.issues.join(', '));
  });
  movers.filter((m) => m.delta < 0).slice(0, 10).forEach((m) => {
    pushIssue('rendah', 'Kata Kunci', m.keyword, `turun dari posisi ${m.prevRank} ke ${m.currentRank}`);
  });

  const order = { tinggi: 0, sedang: 1, rendah: 2 };
  issues.sort((a, b) => order[a.priority] - order[b.priority]);

  return {
    ok: true,
    days: D,
    generatedAt: new Date().toISOString(),
    overall,
    sections,
    seo: {
      siteScore: siteSeoScore,
      siteChecks,
      articles: articleSeo.sort((a, b) => a.score - b.score)
    },
    performa: {
      views, visitors, sessions,
      avgDuration, bounceRate, pagesPerSession, engagementRate,
      avgTtfb, maxTtfb,
      probes, trend, topPages, slowPages, devices, referrers
    },
    konten: {
      total: articles.length,
      published: published.length,
      avgWords,
      categories: categoryList,
      articles: contentRows.sort((a, b) => a.score - b.score)
    },
    keywords: {
      total, ranked, top3, top10, top20, beyond20, volume,
      avgRank: avgRank ? round(avgRank, 1) : null,
      improved, dropped,
      items: movers,
      distribution: [
        { label: 'Posis 1-3', value: top3 },
        { label: 'Posisi 4-10', value: Math.max(0, top10 - top3) },
        { label: 'Posisi 11-20', value: Math.max(0, top20 - top10) },
        { label: 'Posisi >20', value: beyond20 },
        { label: 'Belum ada posisi', value: Math.max(0, total - ranked) }
      ]
    },
    engagement: {
      leadsPeriod: leadTotal30,
      leadsAll,
      leadsByStatus: leadAllByStatus,
      leadsPeriodByStatus: leadRows,
      conversionRate,
      winRate,
      eventTotal,
      eventUnique,
      events: eventRows,
      retentionRate,
      returningVisitors: returning,
      totalVisitors
    },
    issues
  };
}
