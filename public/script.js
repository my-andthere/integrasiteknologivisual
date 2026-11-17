// Navigasi mobile
const toggle = document.querySelector('.nav__toggle');
const links = document.querySelector('.nav__links');

if (toggle && links) {
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

// Animasi muncul saat scroll
const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

// Tandai link nav aktif sesuai section
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav__links a[href^="#"]');

if ('IntersectionObserver' in window && sections.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach((a) => {
          a.style.color = a.getAttribute('href') === `#${entry.target.id}` ? 'var(--blue)' : '';
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => spy.observe(s));
}

/* =========================================================
   Integrasi MySQL (REST API)
   ========================================================= */
const API = '/api';

async function api(path, options) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* --- Layanan (tabel services) --- */
function renderServices(items) {
  const grid = document.getElementById('services-grid');
  if (!grid || !items || !items.length) return;
  grid.innerHTML = '';
  items.forEach((s) => {
    const card = el('article', 'card reveal visible');
    const icon = el('div', 'card__icon', s.icon || '⚙');
    card.appendChild(icon);
    card.appendChild(el('h3', '', s.title));
    card.appendChild(el('p', '', s.description || ''));
    if (Array.isArray(s.features) && s.features.length) {
      const ul = el('ul', 'card__list');
      s.features.forEach((f) => ul.appendChild(el('li', '', f)));
      card.appendChild(ul);
    }
    grid.appendChild(card);
  });
}

/* --- Produk (tabel products) --- */
function renderProducts(items) {
  const grid = document.getElementById('products-grid');
  if (!grid || !items || !items.length) return;
  grid.innerHTML = '';
  items.forEach((p) => {
    const card = el('article', 'card reveal visible');
    card.appendChild(el('h3', '', p.title));
    card.appendChild(el('p', '', p.description || ''));
    if (Array.isArray(p.features) && p.features.length) {
      const ul = el('ul', 'card__list');
      p.features.forEach((f) => ul.appendChild(el('li', '', f)));
      card.appendChild(ul);
    }
    grid.appendChild(card);
  });
}

/* --- Sektor (tabel sectors) --- */
function renderSectors(items) {
  const gridA = document.getElementById('sectors-grid');
  const gridB = document.getElementById('sectors-grid-2');
  if (!items || !items.length) return;
  const make = (s) => {
    const box = el('div', 'segment reveal visible');
    box.appendChild(el('h3', '', s.title));
    box.appendChild(el('p', '', s.description || ''));
    if (s.tags) box.appendChild(el('small', '', s.tags));
    return box;
  };
  if (gridA) {
    gridA.innerHTML = '';
    items.slice(0, 4).forEach((s) => gridA.appendChild(make(s)));
  }
  if (gridB) {
    gridB.innerHTML = '';
    items.slice(4).forEach((s) => gridB.appendChild(make(s)));
  }
}

/* --- Isi dropdown sektor & layanan dari database --- */
function fillSelect(selectId, items, labelKey) {
  const sel = document.getElementById(selectId);
  if (!sel || !items || !items.length) return;
  const first = sel.querySelector('option');
  sel.innerHTML = '';
  sel.appendChild(first);
  items.forEach((it) => {
    const opt = document.createElement('option');
    opt.value = it[labelKey];
    opt.textContent = it[labelKey];
    sel.appendChild(opt);
  });
}

/* --- Status koneksi database --- */
async function renderDbStatus() {
  const head = document.querySelector('.lead-form__head');
  if (!head) return;
  const badge = el('span', 'db-badge', 'Menghubungkan ke MySQL...');
  head.appendChild(badge);
  try {
    const info = await api('/health');
    badge.classList.add('online');
    badge.textContent = `Database terhubung — ${info.database.db} (MySQL ${String(info.database.version).split('-')[0]})`;
  } catch {
    badge.textContent = 'Database offline — konten statis ditampilkan';
  }
}

/* --- Muat data dari API (dengan fallback ke markup statis) --- */
async function loadContent() {
  const tasks = [
    api('/services')
      .then((r) => {
        renderServices(r);
        fillSelect('lfService', r, 'title');
      })
      .catch(() => {}),
    api('/products')
      .then((r) => {
        renderProducts(r);
      })
      .catch(() => {}),
    api('/sectors')
      .then((r) => {
        renderSectors(r);
        fillSelect('lfSector', r, 'title');
      })
      .catch(() => {}),
    renderDbStatus()
  ];
  await Promise.all(tasks);
}

/* --- Kirim form konsultasi ke MySQL --- */
function initLeadForm() {
  const form = document.getElementById('leadForm');
  if (!form) return;
  const msg = document.getElementById('leadMsg');
  const btn = document.getElementById('leadSubmit');

  const setMessage = (text, type) => {
    msg.textContent = text;
    msg.className = 'form__msg ' + (type || '');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('lfName').value.trim();
    const company = document.getElementById('lfCompany').value.trim();
    const email = document.getElementById('lfEmail').value.trim();
    const phone = document.getElementById('lfPhone').value.trim();
    const sector = document.getElementById('lfSector').value.trim();
    const service = document.getElementById('lfService').value.trim();
    const message = document.getElementById('lfMessage').value.trim();

    if (!full_name || !email || !phone) {
      setMessage('Nama lengkap, email, dan nomor WhatsApp wajib diisi.', 'err');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Format email belum benar.', 'err');
      return;
    }

    btn.disabled = true;
    setMessage('Mengirim data...', '');
    try {
      const res = await api('/leads', {
        method: 'POST',
        body: JSON.stringify({ full_name, company, email, phone, sector, service, message })
      });
      setMessage(
        res.ok
          ? 'Terima kasih! Permintaan Anda tersimpan ke database kami. Tim kami akan menghubungi Anda dalam 1x24 jam.'
          : 'Gagal menyimpan: ' + (res.error || 'unknown error'),
        res.ok ? 'ok' : 'err'
      );
      if (res.ok) form.reset();
    } catch (err) {
      setMessage('Tidak dapat terhubung ke server. Silakan WhatsApp 085117183332.', 'err');
    } finally {
      btn.disabled = false;
    }
  });
}

loadContent();
initLeadForm();

/* =========================================================
   Integrasi CMS: SEO, Branding, Analitik, Artikel
   ========================================================= */

/* --- Ambil konfigurasi situs (branding + SEO) --- */
async function loadSiteConfig() {
  try {
    const cfg = await api('/site-config');
    applyBranding(cfg.branding || {});
    applySeoMeta(cfg.seo || {});
    return cfg;
  } catch {
    return null;
  }
}

/* --- Terapkan branding (warna, nama, kontak) --- */
function applyBranding(brand) {
  const root = document.documentElement;
  const val = (key) => String(brand[key] || '').trim();
  const map = {
    'brand.primary_color': '--blue',
    'brand.secondary_color': '--cyan',
    'brand.dark_color': '--navy'
  };
  Object.entries(map).forEach(([key, cssVar]) => {
    const color = val(key);
    if (!color) return;
    if (!/^#[0-9a-f]{3,8}$/i.test(color) && !/^rgba?\(/i.test(color)) return;
    root.style.setProperty(cssVar, color);
  });

  const company = val('brand.company_name');
  if (company) {
    document.querySelectorAll('[data-brand="company"]').forEach((n) => (n.textContent = company));
  }
  const logo = val('brand.logo_text');
  if (logo) {
    document.querySelectorAll('[data-brand="logo"]').forEach((n) => (n.textContent = logo));
  }
  const tagline = val('brand.tagline');
  if (tagline) {
    document.querySelectorAll('[data-brand="tagline"]').forEach((n) => (n.textContent = tagline));
  }
  const phone = val('brand.phone');
  if (phone) {
    document.querySelectorAll('[data-brand="phone"]').forEach((n) => {
      n.textContent = phone;
      if (n.tagName === 'A') n.href = 'tel:+' + phone.replace(/[^0-9+]/g, '');
    });
  }
  const email = val('brand.email');
  if (email) {
    document.querySelectorAll('[data-brand="email"]').forEach((n) => {
      n.textContent = email;
      if (n.tagName === 'A') n.href = 'mailto:' + email;
    });
  }
  const address = val('brand.address');
  if (address) {
    document.querySelectorAll('[data-brand="address"]').forEach((n) => (n.textContent = address));
  }
}

/* --- Terapkan meta SEO (title, description, OG, Twitter, canonical, JSON-LD) --- */
function setMeta(attr, value, content) {
  let tag = document.head.querySelector(`meta[${attr}="${value}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, value);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
  return tag;
}

function applySeoMeta(seo) {
  const val = (key) => String(seo[key] || '').trim();
  const title = val('seo.site_title');
  const desc = val('seo.meta_description');
  const keywords = val('seo.meta_keywords');
  const canonical = val('seo.canonical_base');
  const image = val('seo.og_image');
  const ogType = val('seo.og_type');
  const twitterCard = val('seo.twitter_card');
  const twitterSite = val('seo.twitter_site');
  const robots = val('seo.robots');
  const template = val('seo.title_template');

  if (title) {
    document.title = title;
    setMeta('property', 'og:title', title);
    setMeta('name', 'twitter:title', title);
  }
  if (desc) {
    setMeta('name', 'description', desc);
    setMeta('property', 'og:description', desc);
    setMeta('name', 'twitter:description', desc);
  }
  if (keywords) setMeta('name', 'keywords', keywords);
  if (ogType) setMeta('property', 'og:type', ogType);
  if (twitterCard) setMeta('name', 'twitter:card', twitterCard);
  if (twitterSite) setMeta('name', 'twitter:site', twitterSite);
  if (robots) setMeta('name', 'robots', robots);

  if (canonical) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
    setMeta('property', 'og:url', canonical);
  }

  if (image) {
    const abs = /^https?:\/\//i.test(image) ? image : canonical ? canonical.replace(/\/$/, '') + image : image;
    setMeta('property', 'og:image', abs);
    setMeta('name', 'twitter:image', abs);
  }

  // Google Search Console verification
  const gsv = val('seo.google_site_verification');
  if (gsv) {
    let meta = document.head.querySelector('meta[name="google-site-verification"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'google-site-verification');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', gsv);
  }

  // JSON-LD schema.org (disimpan sebagai JSON di pengaturan)
  const schemaNode = document.getElementById('schemaOrg');
  const rawSchema = val('seo.schema_org');
  if (schemaNode && rawSchema) {
    try {
      schemaNode.textContent = JSON.stringify(JSON.parse(rawSchema), null, 2);
    } catch {
      schemaNode.textContent = rawSchema;
    }
  }

  // Template judul untuk halaman turunan
  if (template) {
    window.__itvTitleTemplate = template;
  }
}

/* --- Pelacakan sederhana: pageview & event --- */
let sessionId = (() => {
  try {
    const k = 'itv_sid';
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    return 'anon-' + Date.now();
  }
})();

function trackPage(path) {
  const payload = JSON.stringify({
    path: path || window.location.pathname,
    referrer: document.referrer || '',
    session_id: sessionId,
    duration: 0
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API + '/track', new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch { /* abaikan */ }
  fetch(API + '/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

function trackEvent(eventName, label) {
  const payload = JSON.stringify({
    event: eventName,
    event_name: eventName,
    label: label || '',
    path: window.location.pathname
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API + '/track/event', new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch { /* abaikan */ }
  fetch(API + '/track/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

function initAnalytics() {
  const started = Date.now();
  trackPage(window.location.pathname);

  document.addEventListener('click', (e) => {
    const node = e.target.closest('[data-track]');
    if (node) trackEvent(node.getAttribute('data-track'), node.textContent.trim().slice(0, 80));
  });

  window.addEventListener('beforeunload', () => {
    const duration = Math.round((Date.now() - started) / 1000);
    try {
      navigator.sendBeacon(
        API + '/track',
        new Blob([JSON.stringify({ path: window.location.pathname, referrer: document.referrer || '', session_id: sessionId, duration })], {
          type: 'application/json'
        })
      );
    } catch { /* abaikan */ }
  });
}

/* --- Daftar artikel terbit --- */
function renderArticles(items) {
  const grid = document.getElementById('articles-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!items || !items.length) {
    grid.appendChild(el('p', 'muted', 'Belum ada artikel yang dipublikasikan.'));
    return;
  }
  items.forEach((a) => {
    const card = el('article', 'article-card reveal visible');
    const cover = el('div', 'article-card__cover', a.category || 'Insight');
    card.appendChild(cover);

    const body = el('div', 'article-card__body');
    body.appendChild(el('span', 'article-card__cat', a.category || 'Insight'));
    body.appendChild(el('h3', '', a.title));

    const meta = el('div', 'article-card__meta');
    meta.appendChild(el('span', '', formatDate(a.published_at)));
    if (a.author) meta.appendChild(el('span', '', a.author));
    if (a.views) meta.appendChild(el('span', '', `${a.views}× dibaca`));
    body.appendChild(meta);

    body.appendChild(el('p', '', a.excerpt || ''));

    const link = el('a', 'article-card__link', 'Baca artikel →');
    link.href = `/artikel.html?slug=${encodeURIComponent(a.slug)}`;
    link.setAttribute('data-track', 'article_click');
    body.appendChild(link);

    card.appendChild(body);
    grid.appendChild(card);
  });
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* --- Muat artikel dari CMS --- */
async function loadArticles() {
  try {
    const items = await api('/articles?limit=6');
    renderArticles(Array.isArray(items) ? items : []);
  } catch {
    const grid = document.getElementById('articles-grid');
    if (grid) grid.innerHTML = '<p class="muted">Artikel belum dapat dimuat.</p>';
  }
}

loadSiteConfig();
loadArticles();
initAnalytics();
