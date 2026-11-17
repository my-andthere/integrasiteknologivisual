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
