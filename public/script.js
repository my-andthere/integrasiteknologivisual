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

// Submenu (dropdown) pada navigasi header
const navGroups = document.querySelectorAll('.nav__group[data-submenu]');

navGroups.forEach((group) => {
  const trigger = group.querySelector('.nav__link--toggle');
  if (!trigger) return;

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = group.classList.contains('open');
    navGroups.forEach((g) => {
      g.classList.remove('open');
      const t = g.querySelector('.nav__link--toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      group.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });

  group.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      group.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
  });
});

// Tutup submenu saat klik di luar header
document.addEventListener('click', (e) => {
  if (e.target.closest('.nav__group[data-submenu]')) return;
  navGroups.forEach((g) => {
    g.classList.remove('open');
    const t = g.querySelector('.nav__link--toggle');
    if (t) t.setAttribute('aria-expanded', 'false');
  });
});

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
        // Tandai tombol submenu induk sebagai aktif
        document.querySelectorAll('.nav__group[data-submenu]').forEach((g) => {
          const active = g.querySelector(`a[href="#${entry.target.id}"]`);
          const trigger = g.querySelector('.nav__link--toggle');
          if (!trigger) return;
          if (active) {
            trigger.style.color = 'var(--blue)';
            trigger.classList.add('is-active');
          } else {
            trigger.style.color = '';
            trigger.classList.remove('is-active');
          }
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

/* --- Terjemahan pesan runtime (lihat public/i18n-data.js -> "j") --- */
function tr(text, vars) {
  if (window.ITV && typeof window.ITV.tm === 'function') return window.ITV.tm(text, vars);
  return text;
}

/* --- Bahasa aktif untuk konten dinamis dari database --- */
function currentLang() {
  return window.ITV && typeof window.ITV.getLang === 'function' ? window.ITV.getLang() : 'id';
}

/* --- Ambil field terjemahan dari payload DB (fallback ke Bahasa Indonesia) --- */
function tf(item, field, fallback) {
  if (!item) return fallback;
  const lang = currentLang();
  const tr2 = item.translations;
  if (lang !== 'id' && tr2) {
    let bag = null;
    try {
      bag = typeof tr2 === 'string' ? JSON.parse(tr2) : tr2;
    } catch { bag = null; }
    if (bag && bag[lang] && bag[lang][field] !== undefined && bag[lang][field] !== null) {
      return bag[lang][field];
    }
  }
  return item[field] !== undefined && item[field] !== null ? item[field] : fallback;
}

/* --- Format angka/tanggal sesuai bahasa aktif --- */
function localeTag() {
  const lang = currentLang();
  if (lang === 'en') return 'en-GB';
  if (lang === 'ja') return 'ja-JP';
  return 'id-ID';
}

/* --- Ikon Bootstrap Icons (dari nama ikon di database) --- */
function biIcon(name) {
  const safe = String(name || 'gear').replace(/[^a-z0-9-]/gi, '') || 'gear';
  return el('i', `bi bi-${safe}`);
}

/* --- Layanan (tabel services) --- */
function renderServices(items) {
  const grid = document.getElementById('services-grid');
  if (!grid || !items || !items.length) return;
  grid.innerHTML = '';
  items.forEach((s) => {
    const card = el('article', 'card reveal visible');
    const icon = el('div', 'card__icon');
    icon.appendChild(biIcon(s.icon || 'gear'));
    card.appendChild(icon);
    card.appendChild(el('h3', '', tf(s, 'title', s.title || '')));
    card.appendChild(el('p', '', tf(s, 'description', s.description || '')));
    const features = tf(s, 'features', s.features);
    if (Array.isArray(features) && features.length) {
      const ul = el('ul', 'card__list');
      features.forEach((f) => ul.appendChild(el('li', '', f)));
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
    card.appendChild(el('h3', '', tf(p, 'title', p.title || '')));
    card.appendChild(el('p', '', tf(p, 'description', p.description || '')));
    const features = tf(p, 'features', p.features);
    if (Array.isArray(features) && features.length) {
      const ul = el('ul', 'card__list');
      features.forEach((f) => ul.appendChild(el('li', '', f)));
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
    box.appendChild(el('h3', '', tf(s, 'title', s.title || '')));
    box.appendChild(el('p', '', tf(s, 'description', s.description || '')));
    const tags = tf(s, 'tags', s.tags);
    if (tags) box.appendChild(el('small', '', tags));
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
    opt.textContent = tf(it, labelKey, it[labelKey]);
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
  const logoUrl = val('brand.logo_url');
  const logoText = val('brand.logo_text');
  document.querySelectorAll('[data-brand="logo"]').forEach((n) => {
    if (logoUrl) {
      n.classList.add('brand__mark--img');
      n.innerHTML = '';
      const img = document.createElement('img');
      img.src = logoUrl;
      img.alt = val('brand.company_name') || 'Logo';
      img.loading = 'eager';
      img.decoding = 'async';
      n.appendChild(img);
    } else {
      n.classList.remove('brand__mark--img');
      if (logoText) n.textContent = logoText;
    }
  });

  const iconUrl = val('brand.icon_url');
  if (iconUrl) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'icon');
      document.head.appendChild(link);
    }
    link.setAttribute('href', iconUrl);
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
    // Durasi dikirim terpisah lewat beacon "beforeunload".
    // Jangan kirim 0 di sini:-duration 0 akan dianggap sebagai beacon
    // dan baris pageview tidak pernah tercatat.
    duration: null
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
  let durationSent = false;
  trackPage(window.location.pathname);

  document.addEventListener('click', (e) => {
    const node = e.target.closest('[data-track]');
    if (node) trackEvent(node.getAttribute('data-track'), node.textContent.trim().slice(0, 80));
  });

  // Kirim durasi sekali saja, baik saat halaman ditutup (beforeunload)
  // maupun saat tab disembunyikan (visibilitychange) — terutama di mobile
  // sebelumunload sering tidak berjalan sehingga durasi tertinggal kosong.
  const sendDuration = () => {
    if (durationSent) return;
    durationSent = true;
    const duration = Math.round((Date.now() - started) / 1000);
    try {
      navigator.sendBeacon(
        API + '/track',
        new Blob([JSON.stringify({ path: window.location.pathname, referrer: document.referrer || '', session_id: sessionId, duration })], {
          type: 'application/json'
        })
      );
    } catch { /* abaikan */ }
  };

  window.addEventListener('beforeunload', sendDuration);
  window.addEventListener('pagehide', sendDuration);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sendDuration();
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
    const cover = el('div', 'article-card__cover');
    if (a.cover_image) {
      cover.style.backgroundImage = `url("${a.cover_image}")`;
      cover.style.backgroundSize = 'cover';
      cover.style.backgroundPosition = 'center';
    } else {
      cover.textContent = a.category || 'Insight';
    }
    card.appendChild(cover);

    const body = el('div', 'article-card__body');
    body.appendChild(el('span', 'article-card__cat', tf(a, 'category', a.category || 'Insight')));
    body.appendChild(el('h3', '', tf(a, 'title', a.title || '')));

    const meta = el('div', 'article-card__meta');
    meta.appendChild(el('span', '', formatDate(a.published_at)));
    if (a.author) meta.appendChild(el('span', '', a.author));
    if (a.views) meta.appendChild(el('span', '', `${a.views}× ${tr('dibaca')}`));
    body.appendChild(meta);

    body.appendChild(el('p', '', tf(a, 'excerpt', a.excerpt || '')));

    const link = el('a', 'article-card__link');
    link.appendChild(document.createTextNode(tr('Baca artikel ')));
    link.appendChild(el('i', 'bi bi-arrow-right'));
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
  return d.toLocaleDateString(localeTag(), { day: 'numeric', month: 'long', year: 'numeric' });
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

/* =========================================================
   Banner Slideshow (Hero Carousel)
   ========================================================= */
let bannerAbort = null;
let bannerTimer = null;

function initBanner() {
  const root = document.getElementById('hero');
  const track = document.getElementById('bannerSlides');
  const dotsBox = document.getElementById('bannerDots');
  const prevBtn = document.getElementById('bannerPrev');
  const nextBtn = document.getElementById('bannerNext');
  if (!root || !track) return;

  /* bersihkan instance sebelumnya agar bisa di-inisialisasi ulang */
  if (bannerAbort) bannerAbort.abort();
  bannerAbort = new AbortController();
  const signal = bannerAbort.signal;
  if (bannerTimer) {
    clearInterval(bannerTimer);
    bannerTimer = null;
  }
  if (dotsBox) dotsBox.innerHTML = '';
  track.style.transform = 'translateX(0)';

  const slides = Array.from(track.querySelectorAll('.banner__slide'));
  if (!slides.length) return;

  const DURATION = 6000;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.style.setProperty('--banner-duration', DURATION + 'ms');

  let index = 0;
  let timer = null;
  let paused = false;

  const dots = slides.map((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'banner__dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', slide.getAttribute('aria-label') || 'Sorotan ' + (i + 1));
    dot.addEventListener('click', () => {
      goTo(i);
      restart();
    }, { signal });
    if (dotsBox) dotsBox.appendChild(dot);
    return dot;
  });

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = 'translateX(-' + index * 100 + '%)';

    slides.forEach((slide, k) => {
      const active = k === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      if ('inert' in HTMLElement.prototype) slide.inert = !active;
    });

    dots.forEach((dot, k) => {
      dot.classList.remove('is-active');
      dot.setAttribute('aria-selected', k === index ? 'true' : 'false');
    });

    const activeDot = dots[index];
    if (activeDot) {
      void activeDot.offsetWidth; /* restart progress animation */
      activeDot.classList.add('is-active');
    }
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (reduced) return;
    timer = setInterval(() => {
      if (!paused) goTo(index + 1);
    }, DURATION);
    bannerTimer = timer;
  }

  function restart() {
    start();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      goTo(index - 1);
      restart();
    }, { signal });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      goTo(index + 1);
      restart();
    }, { signal });
  }

  root.addEventListener('mouseenter', () => { paused = true; }, { signal });
  root.addEventListener('mouseleave', () => { paused = false; }, { signal });
  root.addEventListener('focusin', () => { paused = true; }, { signal });
  root.addEventListener('focusout', () => { paused = false; }, { signal });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      goTo(index - 1);
      restart();
    } else if (e.key === 'ArrowRight') {
      goTo(index + 1);
      restart();
    }
  }, { signal });

  let touchStartX = 0;
  let touching = false;
  root.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.touches[0].clientX;
      touching = true;
      paused = true;
    },
    { passive: true, signal }
  );
  root.addEventListener(
    'touchend',
    (e) => {
      if (!touching) return;
      touching = false;
      paused = false;
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 45) {
        goTo(index + (delta < 0 ? 1 : -1));
        restart();
      }
    },
    { passive: true, signal }
  );

  goTo(0);
  start();
}

/* =========================================================
   Klien & Mitra (dari database)
   ========================================================= */
const PARTNER_ICONS = {
  hardware: 'display',
  infrastructure: 'cloud',
  fintech: 'credit-card',
  software: 'code-square',
  partnership: 'diagram-3',
  delivery: 'tools',
  operations: 'shield-check',
  service: 'headset'
};

function partnerIcon(category) {
  const key = String(category || '').toLowerCase().trim();
  return PARTNER_ICONS[key] || 'diagram-3';
}

function renderClients(payload) {
  if (!payload) return;
  const clientsGrid = document.getElementById('clients-grid');
  const partnersGrid = document.getElementById('partners-grid');
  const clients = Array.isArray(payload.clients) ? payload.clients : [];
  const partners = Array.isArray(payload.partners) ? payload.partners : [];

  if (clientsGrid && clients.length) {
    clientsGrid.innerHTML = '';
    clients.forEach((c) => {
      const card = el('div', 'logo-card reveal visible');
      if (c.image_url) {
        const img = document.createElement('img');
        img.className = 'logo-card__logo';
        img.src = c.image_url;
        img.alt = c.image_alt || c.name || 'Logo klien';
        img.loading = 'lazy';
        card.appendChild(img);
      } else {
        card.appendChild(el('span', 'logo-card__mark', c.initials || 'ITV'));
      }
      const name = el('span', 'logo-card__name', c.name || '');
      if (c.name) card.appendChild(name);
      if (c.segment) card.appendChild(el('span', 'logo-card__meta', c.segment));
      clientsGrid.appendChild(card);
    });
  }

  if (partnersGrid && partners.length) {
    partnersGrid.innerHTML = '';
    partners.forEach((p) => {
      const card = el('article', 'partner-card reveal visible');
      if (p.image_url) {
        const img = document.createElement('img');
        img.className = 'partner-card__logo';
        img.src = p.image_url;
        img.alt = p.image_alt || p.name || 'Logo mitra';
        img.loading = 'lazy';
        card.appendChild(img);
      } else {
        const icon = el('div', 'card__icon');
        icon.appendChild(el('i', 'bi bi-' + partnerIcon(p.category)));
        card.appendChild(icon);
      }
      if (p.name) card.appendChild(el('span', 'partner-card__name', p.name));
      if (p.category) card.appendChild(el('span', 'partner-card__meta', p.category));
      partnersGrid.appendChild(card);
    });
  }
}

/* =========================================================
   KARIER: Lowongan, Magang, PKL + Open Partner
   ========================================================= */

/** Daftar requirement/benefit -> array aman untuk ditampilkan. */
function toList(value) {
  if (Array.isArray(value)) return value.filter((v) => String(v || '').trim());
  if (typeof value === 'string' && value.trim()) {
    return value.split('\n').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

/** Label jenis lowongan sesuai bahasa aktif. */
function jobTypeLabel(type) {
  const map = {
    lowongan: { id: 'Lowongan', en: 'Full-time Role', ja: '正社員募集' },
    magang: { id: 'Magang', en: 'Internship', ja: 'インターン' },
    pkl: { id: 'PKL', en: 'On-the-job Training', ja: '実地実習（PKL）' }
  };
  const entry = map[type] || map.lowongan;
  return tr(entry[currentLang()] || entry.id);
}

/** Ikon sesuai jenis lowongan. */
function jobTypeIcon(type) {
  if (type === 'magang') return 'mortarboard';
  if (type === 'pkl') return 'tools';
  return 'briefcase';
}

function renderJobs(items) {
  const grid = document.getElementById('jobs-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!items || !items.length) {
    grid.appendChild(el('p', 'muted', tr('Belum ada lowongan yang tersedia saat ini.')));
    return;
  }

  items.forEach((job) => {
    const card = el('article', 'card job-card reveal visible');

    /* Kepala: ikon + jenis + judul */
    const head = el('div', 'job-card__head');
    const icon = el('div', 'job-card__icon');
    icon.appendChild(el('i', 'bi bi-' + jobTypeIcon(job.type)));
    head.appendChild(icon);

    const headText = el('div', 'job-card__headtext');
    const badge = el('span', 'job-card__badge', jobTypeLabel(job.type));
    headText.appendChild(badge);
    headText.appendChild(el('h3', 'job-card__title', tr(tf(job, 'title', job.title || ''))));
    head.appendChild(headText);
    card.appendChild(head);

    /* Meta: departemen, lokasi, mode kerja */
    const meta = el('ul', 'job-card__meta');
    const dept = tf(job, 'department', job.department || '');
    const loc = tf(job, 'location', job.location || '');
    if (dept) meta.appendChild(jobMetaItem('diagram-3', dept));
    if (loc) meta.appendChild(jobMetaItem('geo-alt', loc));
    if (job.work_mode) meta.appendChild(jobMetaItem('building', job.work_mode));
    if (job.employment) meta.appendChild(jobMetaItem('clock', job.employment));
    if (meta.childElementCount) card.appendChild(meta);

    /* Deskripsi ringkas (versi lengkap ada di panel detail) */
    const desc = tf(job, 'description', job.description || '');
    if (desc) card.appendChild(el('p', 'job-card__desc', tr(desc)));

    /* Requirement & benefit -> hanya di panel detail */
    const reqs = toList(tf(job, 'requirements', job.requirements));
    const bens = toList(tf(job, 'benefits', job.benefits));

    /* Aksi */
    const actions = el('div', 'job-card__actions');
    const apply = el('a', 'btn btn--primary btn--sm');
    apply.href = '#kontak';
    apply.setAttribute('data-track', 'job_apply');
    apply.textContent = tr('Lamar Sekarang');
    actions.appendChild(apply);

    const detail = el('button', 'btn btn--outline btn--sm');
    detail.type = 'button';
    detail.setAttribute('data-track', 'job_detail');
    detail.textContent = tr('Lihat Detail');
    detail.addEventListener('click', () => {
      toggleJobDetail(card, job, reqs, bens);
      detail.textContent = card.querySelector('.job-card__detail')
        ? tr('Sembunyikan Detail') : tr('Lihat Detail');
    });
    actions.appendChild(detail);
    card.appendChild(actions);

    grid.appendChild(card);
  });
}

/** Baris meta kecil dengan ikon. */
function jobMetaItem(icon, text) {
  const li = el('li');
  li.appendChild(el('i', 'bi bi-' + icon));
  li.appendChild(document.createTextNode(' ' + text));
  return li;
}

/** Buka/tutup detail lowongan (deskripsi + kualifikasi lengkap). */
function toggleJobDetail(card, job, reqs, bens) {
  const existing = card.querySelector('.job-card__detail');
  if (existing) { existing.remove(); return; }

  const detail = el('div', 'job-card__detail');

  if (reqs.length) {
    detail.appendChild(el('h4', 'job-card__listtitle', tr('Kualifikasi')));
    const ul = el('ul', 'job-card__ul');
    reqs.forEach((r) => ul.appendChild(el('li', '', tr(r))));
    detail.appendChild(ul);
  }
  if (bens.length) {
    detail.appendChild(el('h4', 'job-card__listtitle', tr('Yang Anda Dapatkan')));
    const ul = el('ul', 'job-card__ul job-card__ul--ben');
    bens.forEach((b) => ul.appendChild(el('li', '', tr(b))));
    detail.appendChild(ul);
  }
  card.appendChild(detail);
}

/** Render program Open Partner. */
function renderPartnerPrograms(items) {
  const grid = document.getElementById('partner-programs-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!items || !items.length) {
    grid.appendChild(el('p', 'muted', tr('Belum ada program kemitraan yang tersedia saat ini.')));
    return;
  }

  items.forEach((p) => {
    const card = el('article', 'card partner-program reveal visible');

    const icon = el('div', 'partner-program__icon');
    icon.appendChild(el('i', 'bi bi-' + partnerProgramIcon(p.category)));
    card.appendChild(icon);

    card.appendChild(el('span', 'partner-program__cat', tr(tf(p, 'category', p.category || ''))));
    card.appendChild(el('h3', 'partner-program__title', tr(tf(p, 'title', p.title || ''))));

    const desc = tf(p, 'description', p.description || '');
    if (desc) card.appendChild(el('p', 'partner-program__desc', tr(desc)));

    const bens = toList(tf(p, 'benefits', p.benefits));
    if (bens.length) {
      const ul = el('ul', 'partner-program__ul');
      bens.forEach((b) => {
        const li = el('li');
        li.appendChild(el('i', 'bi bi-check2-circle'));
        li.appendChild(document.createTextNode(' ' + tr(b)));
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    const reqs = toList(tf(p, 'requirements', p.requirements));
    if (reqs.length) {
      const box = el('details', 'partner-program__req');
      const sum = document.createElement('summary');
      sum.textContent = tr('Syarat Kemitraan');
      box.appendChild(sum);
      const ul = el('ul', 'partner-program__ul');
      reqs.forEach((r) => {
        const li = el('li');
        li.appendChild(el('i', 'bi bi-dot'));
        li.appendChild(document.createTextNode(' ' + tr(r)));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      card.appendChild(box);
    }

    const actions = el('div', 'partner-program__actions');
    const cta = el('a', 'btn btn--primary btn--sm');
    cta.href = p.cta_url || '#kontak';
    cta.setAttribute('data-track', 'partner_program_apply');
    cta.textContent = tr(tf(p, 'cta_label', p.cta_label || 'Ajukan Kemitraan'));
    actions.appendChild(cta);
    card.appendChild(actions);

    grid.appendChild(card);
  });
}

/** Ikon program kemitraan sesuai kategori. */
function partnerProgramIcon(category) {
  const map = {
    Technology: 'cpu', Integrator: 'diagram-3', Referral: 'share',
    Reseller: 'cart', OEM: 'box-seam', Cloud: 'cloud'
  };
  return map[category] || 'people';
}

/* --- Muat data karier dari CMS --- */
let allJobs = [];
let activeJobFilter = 'lowongan';

async function loadJobs() {
  try {
    const data = await api('/jobs');
    allJobs = Array.isArray(data) ? data : (data.jobs || []);
    applyJobFilter();
  } catch {
    const grid = document.getElementById('jobs-grid');
    if (grid) grid.innerHTML = '<p class="muted">' + tr('Lowongan belum dapat dimuat.') + '</p>';
  }
}

function applyJobFilter() {
  const list = allJobs.filter((j) => !activeJobFilter || j.type === activeJobFilter);
  renderJobs(list);
}

/* --- Muat data Open Partner --- */
async function loadPartnerPrograms() {
  try {
    const data = await api('/partner-programs');
    const items = Array.isArray(data) ? data : (data.programs || []);
    renderPartnerPrograms(items);
  } catch {
    const grid = document.getElementById('partner-programs-grid');
    if (grid) grid.innerHTML = '<p class="muted">' + tr('Program kemitraan belum dapat dimuat.') + '</p>';
  }
}

/* --- Tab filter lowongan --- */
function initJobTabs() {
  const tabs = document.querySelectorAll('[data-job-filter]');
  if (!tabs.length) return;
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeJobFilter = btn.getAttribute('data-job-filter') || 'lowongan';
      tabs.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      applyJobFilter();
    });
  });
}

async function loadClients() {
  try {
    const data = await api('/clients');
    renderClients(data);
  } catch {
    /* biarkan markup statis sebagai fallback */
  }
}

/* =========================================================
   Banner Slideshow dari database
   ========================================================= */

/** Escape teks biasa agar aman disisipkan ke innerHTML. */
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitasi HTML terbatas untuk deskripsi slide.
 * Hanya tag <strong>, <em>, <br> yang diizinkan.
 */
function sanitizeRichHtml(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/&lt;(\/?)(strong|em|b|i|br)\s*\/?&gt;/gi, '<$1$2>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}

/** Validasi nilai warna aksen (rgba / hex) agar tidak bisa menyuntik CSS. */
function safeAccent(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/i.test(v)) return v;
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  return '';
}

function buildBannerImageSlide(slide, index, isFirst) {
  const article = document.createElement('article');
  article.className = 'banner__slide banner__slide--image' + (isFirst ? ' is-active' : '');
  article.setAttribute('data-banner-slide', String(index + 1));
  article.setAttribute('role', 'group');
  article.setAttribute('aria-roledescription', 'slide');
  const L_TITLE = tf(slide, 'title', slide.title || '');
  const L_HIGHLIGHT = tf(slide, 'title_highlight', slide.title_highlight || '');
  const L_EYEBROW = tf(slide, 'eyebrow', slide.eyebrow || '');
  const L_DESCRIPTION = tf(slide, 'description', slide.description || '');
  const L_CTA = tf(slide, 'cta_label', slide.cta_label || '');
  const L_CTA2 = tf(slide, 'cta2_label', slide.cta2_label || '');
  const L_ALT = tf(slide, 'image_alt', slide.image_alt || slide.title || '');

  article.setAttribute('aria-label', L_ALT || 'Sorotan ' + (index + 1));

  const img = document.createElement('img');
  img.className = 'banner__image';
  img.src = slide.image_url;
  img.alt = L_ALT;
  img.loading = index === 0 ? 'eager' : 'lazy';
  img.decoding = 'async';
  article.appendChild(img);

  const overlay = document.createElement('div');
  overlay.className = 'banner__overlay';
  article.appendChild(overlay);

  const showCaption = Number(slide.show_caption) === 1;
  if (!showCaption) {
    // Slide gambar murni: judul tetap ada untuk SEO/aksesibilitas.
    const sr = document.createElement(isFirst ? 'h1' : 'h2');
    sr.className = 'visually-hidden';
    sr.textContent = [L_TITLE, L_HIGHLIGHT].filter(Boolean).join(' ');
    article.appendChild(sr);
  }

  if (showCaption && (L_TITLE || L_DESCRIPTION || L_CTA)) {
    const caption = document.createElement('div');
    caption.className = 'wrap banner__caption';

    if (L_EYEBROW) {
      const eyebrow = document.createElement('span');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = L_EYEBROW;
      caption.appendChild(eyebrow);
    }

    const heading = document.createElement(isFirst ? 'h1' : 'h2');
    heading.className = 'banner__title';
    heading.appendChild(document.createTextNode(L_TITLE));
    if (L_HIGHLIGHT) {
      const hl = document.createElement('span');
      hl.textContent = L_HIGHLIGHT;
      heading.appendChild(document.createTextNode(' '));
      heading.appendChild(hl);
    }
    caption.appendChild(heading);

    if (L_DESCRIPTION) {
      const lead = document.createElement('p');
      lead.className = 'hero__lead';
      lead.innerHTML = sanitizeRichHtml(L_DESCRIPTION);
      caption.appendChild(lead);
    }

    if (L_CTA || L_CTA2) {
      const actions = document.createElement('div');
      actions.className = 'hero__actions';
      if (L_CTA) {
        const a = document.createElement('a');
        a.href = slide.cta_url || '#kontak';
        a.className = 'btn btn--primary';
        a.setAttribute('data-track', 'cta_hero_konsultasi');
        a.textContent = L_CTA;
        actions.appendChild(a);
      }
      if (L_CTA2) {
        const a = document.createElement('a');
        a.href = slide.cta2_url || '#layanan';
        a.className = 'btn btn--ghost';
        a.setAttribute('data-track', 'cta_hero_layanan');
        a.textContent = L_CTA2;
        actions.appendChild(a);
      }
      caption.appendChild(actions);
    }

    article.appendChild(caption);
  }

  return article;
}

function buildBannerSlide(slide, index) {
  const isFirst = index === 0;
  const imageUrl = String(slide.image_url || '').trim();
  if (imageUrl) return buildBannerImageSlide(slide, index, isFirst);

  const article = document.createElement('article');
  article.className = 'banner__slide' + (isFirst ? ' is-active' : '');
  article.setAttribute('data-banner-slide', String(index + 1));
  article.setAttribute('role', 'group');
  article.setAttribute('aria-roledescription', 'slide');
  article.setAttribute('aria-label', slide.eyebrow || slide.title || 'Sorotan ' + (index + 1));

  const accent = safeAccent(slide.accent);
  if (accent) article.style.setProperty('--slide-accent', accent);

  const inner = document.createElement('div');
  inner.className = 'wrap banner__inner';

  const copy = document.createElement('div');
  copy.className = 'banner__copy';

  if (slide.eyebrow) {
    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = slide.eyebrow;
    copy.appendChild(eyebrow);
  }

  const heading = document.createElement(isFirst ? 'h1' : 'h2');
  heading.className = 'banner__title';
  heading.appendChild(document.createTextNode(slide.title || ''));
  if (slide.title_highlight) {
    const hl = document.createElement('span');
    hl.textContent = slide.title_highlight;
    heading.appendChild(document.createTextNode(' '));
    heading.appendChild(hl);
  }
  copy.appendChild(heading);

  if (slide.description) {
    const lead = document.createElement('p');
    lead.className = 'hero__lead';
    lead.innerHTML = sanitizeRichHtml(slide.description);
    copy.appendChild(lead);
  }

  if (slide.cta_label || slide.cta2_label) {
    const actions = document.createElement('div');
    actions.className = 'hero__actions';
    if (slide.cta_label) {
      const a = document.createElement('a');
      a.href = slide.cta_url || '#kontak';
      a.className = 'btn btn--primary';
      a.setAttribute('data-track', 'cta_hero_konsultasi');
      a.textContent = slide.cta_label;
      actions.appendChild(a);
    }
    if (slide.cta2_label) {
      const a = document.createElement('a');
      a.href = slide.cta2_url || '#layanan';
      a.className = 'btn btn--ghost';
      a.setAttribute('data-track', 'cta_hero_layanan');
      a.textContent = slide.cta2_label;
      actions.appendChild(a);
    }
    copy.appendChild(actions);
  }

  const badges = Array.isArray(slide.badges) ? slide.badges : [];
  if (badges.length) {
    const box = document.createElement('div');
    box.className = 'hero__badges';
    badges.forEach((b) => {
      const item = document.createElement('div');
      const v = document.createElement('b');
      v.textContent = b.v || '';
      const l = document.createElement('span');
      l.textContent = b.l || '';
      item.appendChild(v);
      item.appendChild(l);
      box.appendChild(item);
    });
    copy.appendChild(box);
  }

  inner.appendChild(copy);

  if (slide.visual_title || slide.visual_label || (slide.chips && slide.chips.length)) {
    const aside = document.createElement('aside');
    aside.className = 'card-visual';

    if (slide.visual_title) {
      const h3 = document.createElement('h3');
      h3.textContent = slide.visual_title;
      aside.appendChild(h3);
    }

    if (slide.visual_label || slide.visual_caption) {
      const screen = document.createElement('div');
      screen.className = 'screen';
      const innerBox = document.createElement('div');
      const b = document.createElement('b');
      b.textContent = slide.visual_label || '';
      const s = document.createElement('span');
      s.textContent = slide.visual_caption || '';
      innerBox.appendChild(b);
      innerBox.appendChild(s);
      screen.appendChild(innerBox);
      aside.appendChild(screen);
    }

    const chips = Array.isArray(slide.chips) ? slide.chips : [];
    if (chips.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      chips.forEach((c) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = c;
        row.appendChild(chip);
      });
      aside.appendChild(row);
    }

    inner.appendChild(aside);
  }

  article.appendChild(inner);
  return article;
}

function renderBanners(slides) {
  const track = document.getElementById('bannerSlides');
  if (!track || !Array.isArray(slides) || !slides.length) return false;
  track.innerHTML = '';
  slides.forEach((slide, i) => track.appendChild(buildBannerSlide(slide, i)));
  return true;
}

async function loadBanners() {
  try {
    const data = await api('/banners');
    const slides = Array.isArray(data) ? data : data.slides;
    if (renderBanners(slides)) {
      initBanner();
    }
  } catch {
    /* biarkan markup statis sebagai fallback */
  }
}

initBanner();
loadBanners();
loadClients();
initJobTabs();
loadJobs();
loadPartnerPrograms();

/* Muat ulang konten dinamis saat pengunjung berganti bahasa (ID / EN / JA).
   initLeadForm() sengaja TIDAK dipanggil ulang agar listener submit tidak
   terpasang dua kali. */
if (window.ITV && typeof window.ITV.onChange === 'function') {
  window.ITV.onChange(() => {
    loadContent();
    loadSiteConfig();
    loadArticles();
    loadBanners();
    loadClients();
    loadJobs();
    loadPartnerPrograms();
  });
}
