/* Portal CMS — PT. Integration Teknologi Visual */
(function () {
  'use strict';

  const TOKEN_KEY = 'itv_cms_token';
  let token = localStorage.getItem(TOKEN_KEY) || '';
  let settings = { branding: {}, seo: {} };
  let currentView = 'dashboard';

  /* ---------------- util ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = (n) => (n === null || n === undefined ? '0' : Number(n).toLocaleString('id-ID'));
  const num = (v, d = 0) => (v === null || v === undefined || v === '' || isNaN(v) ? d : Number(v));

  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, ms);
  }

  async function api(path, options = {}) {
    const opts = { method: options.method || 'GET', headers: {} };
    if (options.body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(options.body);
    }
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api${path}`, opts);
    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    if (res.status === 401) {
      logout(false);
      throw new Error(data.error || 'sesi berakhir');
    }
    if (!res.ok) throw new Error(data.error || `gagal (${res.status})`);
    return data;
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function barList(items, labelKey, valueKey) {
    if (!items || !items.length) return '<p class="muted">Belum ada data.</p>';
    const max = Math.max(...items.map((i) => num(i[valueKey])), 1);
    return items.map((i) => {
      const label = escapeHtml(i[labelKey] ?? '-');
      const val = fmt(i[valueKey]);
      const pct = Math.round((num(i[valueKey]) / max) * 100);
      return `<div class="bar-item">
        <div class="bar-item__head"><span>${label}</span><span>${val}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  function columnChart(rows, labelKey, valueKey) {
    if (!rows || !rows.length) return '<p class="muted">Belum ada data.</p>';
    const max = Math.max(...rows.map((r) => num(r[valueKey])), 1);
    return rows.map((r) => {
      const h = Math.max(3, Math.round((num(r[valueKey]) / max) * 100));
      return `<div class="chart__col" style="height:${h}%"><span>${escapeHtml(r[labelKey])}: ${fmt(r[valueKey])}</span></div>`;
    }).join('');
  }

  /* ---------------- auth ---------------- */
  function logout(callApi = true) {
    if (callApi && token) api('/admin/logout', { method: 'POST' }).catch(() => {});
    token = '';
    localStorage.removeItem(TOKEN_KEY);
    $('#appScreen').hidden = true;
    $('#loginScreen').hidden = false;
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#loginMsg');
    msg.textContent = '';
    try {
      const res = await api('/admin/login', {
        method: 'POST',
        body: { username: $('#loginUser').value, password: $('#loginPass').value }
      });
      token = res.token;
      localStorage.setItem(TOKEN_KEY, token);
      await startApp();
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  $('#logoutBtn').addEventListener('click', () => logout(true));

  /* ---------------- router ---------------- */
  function showView(name) {
    currentView = name;
    $$('.view').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
    $$('.nav__item').forEach((b) => b.classList.toggle('is-active', b.dataset.view === name));
    const loaders = {
      dashboard: loadDashboard,
      articles: loadArticles,
      seo: loadSeo,
      branding: loadBranding,
      keywords: loadKeywords,
      clients: loadClientsPartners,
      banners: loadBanners,
      careers: loadCareers,
      analytics: loadAnalytics,
      indicators: loadIndicators,
      leads: loadLeads
    };
    if (loaders[name]) loaders[name]().catch((e) => toast(e.message));
  }

  $$('.nav__item').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  /* ---------------- dashboard ---------------- */
  async function loadDashboard() {
    const d = await api('/admin/dashboard');
    const s = d.summary || {};
    const cards = [
      { label: 'Page View (30 hari)', value: fmt(s.pv_30d), hint: `${fmt(s.pv_today)} hari ini` },
      { label: 'Pengunjung Unik', value: fmt(s.visitors_30d), hint: `${fmt(s.visitors_today)} hari ini` },
      { label: 'Rata-rata Durasi', value: `${fmt(Math.round(s.avg_duration))} dtk`, hint: 'per kunjungan' },
      { label: 'Leads 30 hari', value: fmt(s.leads_30d), hint: `${fmt(s.leads_new)} baru` },
      { label: 'Artikel Terbit', value: `${fmt(s.articles_published)}/${fmt(s.articles_total)}`, hint: 'artikel aktif' },
      { label: 'Kata Kunci Dipantau', value: fmt(s.keywords_total), hint: 'target SEO' },
      { label: 'Klien & Mitra', value: `${fmt(s.clients_total)}/${fmt(s.partners_total)}`, hint: 'klien / mitra' },
      { label: 'Slide Banner', value: fmt(s.banners_total), hint: 'slide hero aktif' }
    ];
    $('#kpiGrid').innerHTML = cards.map((c) => `
      <div class="kpi">
        <div class="kpi__label">${c.label}</div>
        <div class="kpi__value">${c.value}</div>
        <div class="kpi__hint">${c.hint}</div>
      </div>`).join('');

    $('#chartTraffic').innerHTML = columnChart(d.trend || [], 'day', 'views');
    $('#deviceList').innerHTML = barList(d.devices, 'device', 'views');
    $('#topPages').innerHTML = barList(d.topPages, 'path', 'views');
    $('#referrerList').innerHTML = barList(d.referrers, 'source', 'views');
    $('#browserList').innerHTML = barList(d.browsers, 'browser', 'views');
    $('#topArticles').innerHTML = (d.topArticles && d.topArticles.length)
      ? d.topArticles.map((a) => `<div class="bar-item">
          <div class="bar-item__head"><span>${escapeHtml(a.title)}</span><span>${fmt(a.views)} views</span></div>
        </div>`).join('')
      : '<p class="muted">Belum ada artikel terbit.</p>';
  }

  /* ---------------- artikel ---------------- */
  let allArticles = [];

  async function loadArticles() {
    const res = await api('/admin/articles');
    allArticles = res.articles || [];
    renderArticles();
  }

  function renderArticles() {
    const q = ($('#articleSearch').value || '').toLowerCase();
    const st = $('#articleFilter').value;
    const rows = allArticles.filter((a) => {
      if (st && a.status !== st) return false;
      if (q && !`${a.title} ${a.category || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const tb = $('#articleTable tbody');
    if (!rows.length) {
      tb.innerHTML = '<tr><td colspan="6" class="muted">Belum ada artikel.</td></tr>';
      return;
    }
    tb.innerHTML = rows.map((a) => `
      <tr>
        <td><strong>${escapeHtml(a.title)}</strong><br><small>/${escapeHtml(a.slug)}</small></td>
        <td>${escapeHtml(a.category || '-')}</td>
        <td><span class="badge badge--${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></td>
        <td>${fmt(a.views)}</td>
        <td>${a.seo_title && a.seo_description && a.focus_keyword ? '<i class="bi bi-check-circle-fill seo-ok"></i> Lengkap' : '<i class="bi bi-exclamation-triangle-fill seo-warn"></i> Lengkapi'}</td>
        <td>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${a.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-act="toggle" data-id="${a.id}">${a.status === 'published' ? 'Unpublish' : 'Publish'}</button>
          <button class="btn btn--ghost btn--sm" data-act="del" data-id="${a.id}">Hapus</button>
        </td>
      </tr>`).join('');

    $$('#articleTable [data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (btn.dataset.act === 'edit') return openEditor(id);
        if (btn.dataset.act === 'toggle') {
          const a = allArticles.find((x) => String(x.id) === String(id));
          try {
            await api(`/admin/articles/${id}`, {
              method: 'PUT',
              body: { ...a, status: a.status === 'published' ? 'draft' : 'published' }
            });
            toast('Status artikel diperbarui');
            loadArticles();
          } catch (e) { toast(e.message); }
          return;
        }
        if (btn.dataset.act === 'del') {
          if (!confirm('Hapus artikel ini?')) return;
          try {
            await api(`/admin/articles/${id}`, { method: 'DELETE' });
            toast('Artikel dihapus');
            loadArticles();
          } catch (e) { toast(e.message); }
        }
      });
    });
  }

  $('#articleSearch').addEventListener('input', renderArticles);
  $('#articleFilter').addEventListener('change', renderArticles);
  $('#newArticleBtn').addEventListener('click', () => openEditor(null));
  $('#cancelEdit').addEventListener('click', () => showView('articles'));

  async function openEditor(id) {
    const form = $('#articleForm');
    form.reset();
    $('#editorTitle').textContent = id ? 'Edit Artikel' : 'Artikel Baru';
    if (id) {
      const res = await api(`/admin/articles/${id}`);
      const a = res.article || {};
      form.title.value = a.title || '';
      form.slug.value = a.slug || '';
      form.excerpt.value = a.excerpt || '';
      form.content.value = a.content || '';
      form.category.value = a.category || '';
      form.author.value = a.author || '';
      form.tags.value = (a.tags || []).join(', ');
      form.cover_image.value = a.cover_image || '';
      form.status.value = a.status || 'draft';
      form.published_at.value = a.published_at ? String(a.published_at).slice(0, 16) : '';
      form.seo_title.value = a.seo_title || '';
      form.seo_description.value = a.seo_description || '';
      form.focus_keyword.value = a.focus_keyword || '';
      form.keywords.value = (a.keywords || []).map((k) => k.keyword).join(', ');
      fillTranslations(form, 'article', a.translations);
      form.dataset.id = a.id;
    } else {
      delete form.dataset.id;
      form.status.value = 'draft';
      fillTranslations(form, 'article', null);
    }
    updateSerpPreview();
    showView('editor');
  }

  function updateSerpPreview() {
    const form = $('#articleForm');
    const t = form.seo_title.value || form.title.value || 'Judul artikel';
    const d = form.seo_description.value || form.excerpt.value || 'Deskripsi artikel akan tampil di sini.';
    const base = (settings.seo && settings.seo['seo.canonical_base']) || 'https://example.com';
    $('#serpPreview').innerHTML = `
      <div class="preview__url">${escapeHtml(base)}/artikel/${escapeHtml(form.slug.value || 'slug-artikel')}</div>
      <div class="preview__title">${escapeHtml(t)}</div>
      <div class="preview__desc">${escapeHtml(d)}</div>`;
    $('#seoTitleCount').textContent = `${form.seo_title.value.length}/70`;
    $('#seoDescCount').textContent = `${form.seo_description.value.length}/160`;
  }

  ['title', 'slug', 'excerpt', 'seo_title', 'seo_description'].forEach((n) => {
    $(`[name="${n}"]`).addEventListener('input', updateSerpPreview);
  });

  $('#articleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      title: form.title.value,
      slug: form.slug.value,
      excerpt: form.excerpt.value,
      content: form.content.value,
      category: form.category.value,
      author: form.author.value,
      tags: form.tags.value,
      cover_image: form.cover_image.value,
      status: form.status.value,
      published_at: form.published_at.value || null,
      seo_title: form.seo_title.value,
      seo_description: form.seo_description.value,
      focus_keyword: form.focus_keyword.value,
      keywords: form.keywords.value.split(',').map((k) => k.trim()).filter(Boolean),
      translations: collectTranslations(form, 'article')
    };
    try {
      if (form.dataset.id) {
        await api(`/admin/articles/${form.dataset.id}`, { method: 'PUT', body: payload });
        toast('Artikel diperbarui');
      } else {
        await api('/admin/articles', { method: 'POST', body: payload });
        toast('Artikel dibuat');
      }
      showView('articles');
    } catch (err) { toast(err.message); }
  });

  /* ---------------- settings (SEO & branding) ---------------- */
  function applySettingsToForm() {
    $$('[data-setting]').forEach((el) => {
      const key = el.dataset.setting;
      const group = key.split('.')[0] === 'brand' ? 'branding' : 'seo';
      const val = (settings[group] || {})[key];
      if (el.type === 'checkbox') el.checked = String(val) === '1';
      else el.value = val ?? '';
    });
    updateBrandPreview();
  }

  async function loadSettings() {
    const res = await api('/admin/settings');
    settings = res.groups || {};
    applySettingsToForm();
  }

  async function loadSeo() {
    await loadSettings();
    const audit = await api('/admin/seo/audit');
    const score = num(audit.score);
    $('#seoScore').textContent = score;
    const el = $('#seoScore');
    el.style.background = `conic-gradient(var(--blue) ${score}%, var(--line) ${score}%)`;
    $('#seoChecks').innerHTML = (audit.checks || []).map((c) => `
      <div class="check">
        <span class="mark ${c.ok ? 'ok' : 'no'}"><i class="bi ${c.ok ? 'bi-check-lg' : 'bi-x-lg'}"></i></span>
        <span><b>${escapeHtml(c.name)}</b> <small>— ${escapeHtml(c.detail)}</small></span>
      </div>`).join('');
    $('#seoArticleTable tbody').innerHTML = (audit.articles || []).length
      ? audit.articles.map((a) => `
        <tr>
          <td>${escapeHtml(a.title)}<br><small>${a.wordCount} kata</small></td>
          <td><strong>${a.score}</strong>/100</td>
          <td class="muted">${a.issues.length ? escapeHtml(a.issues.join(', ')) : 'Tidak ada masalah'}</td>
        </tr>`).join('')
      : '<tr><td colspan="3" class="muted">Belum ada artikel.</td></tr>';
  }

  function updateBrandPreview() {
    const b = settings.branding || {};
    const primary = b['brand.primary_color'] || '#1f6feb';
    const secondary = b['brand.secondary_color'] || '#00b8d9';
    const dark = b['brand.dark_color'] || '#0b1f3a';
    const root = document.documentElement;
    root.style.setProperty('--pb-primary', primary);
    root.style.setProperty('--pb-dark', dark);
    $('#pbLogo').textContent = b['brand.logo_text'] || 'ITV';
    $('#pbTagline').textContent = b['brand.tagline'] || '';
    $('#pbName').textContent = b['brand.company_name'] || '';
    $('#pbContact').textContent = [b['brand.email'], b['brand.phone'], b['brand.address']].filter(Boolean).join(' • ');
    const bar = $('#pbBar');
    bar.style.background = `linear-gradient(120deg, ${dark}, ${secondary})`;
    bar.querySelector('.preview-brand__logo').style.background = primary;
  }

  async function loadBranding() {
    await loadSettings();
  }

  $$('[data-save-group]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const group = btn.dataset.saveGroup;
      const payload = {};
      $$('[data-setting]').forEach((el) => {
        const key = el.dataset.setting;
        if (!key.startsWith(group === 'seo' ? 'seo.' : 'brand.')) return;
        if (el.type === 'checkbox') payload[key] = el.checked ? '1' : '0';
        else payload[key] = el.value;
      });
      try {
        await api('/admin/settings', { method: 'PUT', body: payload });
        toast('Pengaturan tersimpan');
        await loadSettings();
        if (group === 'seo') loadSeo();
      } catch (e) { toast(e.message); }
    });
  });

  $$('[data-setting]').forEach((el) => {
    el.addEventListener('input', () => {
      const key = el.dataset.setting;
      const group = key.startsWith('brand.') ? 'branding' : 'seo';
      settings[group] = settings[group] || {};
      settings[group][key] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
      updateBrandPreview();
    });
  });

  /* ---------------- kata kunci ---------------- */
  let allKeywords = [];

  async function loadKeywords() {
    const res = await api('/admin/keywords');
    allKeywords = res.keywords || [];
    renderKeywords();
  }

  function renderKeywords() {
    const q = ($('#keywordSearch').value || '').toLowerCase();
    const rows = allKeywords.filter((k) => !q || k.keyword.toLowerCase().includes(q));
    const tb = $('#keywordTable tbody');
    tb.innerHTML = rows.length ? rows.map((k) => `
      <tr>
        <td><strong>${escapeHtml(k.keyword)}</strong></td>
        <td>${fmt(k.search_volume)}</td>
        <td>${fmt(k.difficulty)}</td>
        <td>${k.current_rank ? `#${k.current_rank}` : '-'}</td>
        <td>${escapeHtml(k.intent || '-')}</td>
        <td>${fmt(k.article_count)}</td>
        <td>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${k.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-act="del" data-id="${k.id}">Hapus</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="7" class="muted">Belum ada kata kunci.</td></tr>';

    $$('#keywordTable [data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = allKeywords.find((x) => String(x.id) === String(btn.dataset.id));
        if (btn.dataset.act === 'edit') {
          const form = $('#keywordForm');
          form.id.value = k.id;
          form.keyword.value = k.keyword;
          form.search_volume.value = k.search_volume;
          form.difficulty.value = k.difficulty;
          form.current_rank.value = k.current_rank || '';
          form.target_url.value = k.target_url || '';
          form.intent.value = k.intent || 'informational';
          form.status.value = k.status || 'tracked';
          form.notes.value = k.notes || '';
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else {
          if (!confirm('Hapus kata kunci ini?')) return;
          api(`/admin/keywords/${btn.dataset.id}`, { method: 'DELETE' })
            .then(() => { toast('Kata kunci dihapus'); loadKeywords(); })
            .catch((e) => toast(e.message));
        }
      });
    });
  }

  $('#keywordSearch').addEventListener('input', renderKeywords);

  $('#keywordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      keyword: form.keyword.value,
      search_volume: num(form.search_volume.value),
      difficulty: num(form.difficulty.value),
      current_rank: form.current_rank.value ? num(form.current_rank.value) : null,
      target_url: form.target_url.value,
      intent: form.intent.value,
      status: form.status.value,
      notes: form.notes.value
    };
    try {
      if (form.id.value) await api(`/admin/keywords/${form.id.value}`, { method: 'PUT', body });
      else await api('/admin/keywords', { method: 'POST', body });
      toast('Kata kunci disimpan');
      form.reset();
      form.id.value = '';
      loadKeywords();
    } catch (err) { toast(err.message); }
  });

  $('#resetKeyword').addEventListener('click', () => {
    const form = $('#keywordForm');
    form.reset();
    form.id.value = '';
  });

  /* ---------------- klien & mitra ---------------- */
  let allClients = [];
  let allPartners = [];

  function fillOptions(select, values, current) {
    if (!select) return;
    const unique = Array.from(new Set(values.filter(Boolean)));
    if (current && !unique.includes(current)) unique.unshift(current);
    select.innerHTML = unique.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    if (current) select.value = current;
  }

  function ensureOption(select, value) {
    if (!select || !value) return;
    if (Array.from(select.options).some((o) => o.value === value)) {
      select.value = value;
      return;
    }
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
    select.value = value;
  }

  async function loadClientsPartners() {
    const [c, p] = await Promise.all([api('/admin/clients'), api('/admin/partners')]);
    allClients = c.clients || [];
    allPartners = p.partners || [];
    fillOptions($('#clientSegment'), c.segments || [], 'Retail');
    fillOptions($('#partnerCategory'), p.categories || [], 'Software');
    renderClients();
    renderPartners();
  }

  function statusBadge(isActive) {
    return Number(isActive) === 1
      ? '<span class="badge badge--published">Aktif</span>'
      : '<span class="badge badge--archived">Nonaktif</span>';
  }

  function renderClients() {
    const tb = $('#clientTable tbody');
    tb.innerHTML = allClients.length ? allClients.map((cl) => `
      <tr>
        <td>${cl.image_url ? `<img src="${escapeHtml(cl.image_url)}" alt="${escapeHtml(cl.image_alt || cl.name)}" style="width:96px;height:60px;object-fit:contain;border-radius:8px;border:1px solid var(--line);background:#f5f8fc" />` : '<small class="muted">Tanpa logo</small>'}</td>
        <td><strong>${escapeHtml(cl.name)}</strong><br><small>/${escapeHtml(cl.slug)}</small></td>
        <td>${escapeHtml(cl.segment)}</td>
        <td>${escapeHtml(cl.initials)}</td>
        <td>${fmt(cl.sort_order)}</td>
        <td>${statusBadge(cl.is_active)}</td>
        <td>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${cl.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-act="del" data-id="${cl.id}">Hapus</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="7" class="muted">Belum ada klien.</td></tr>';

    $$('#clientTable [data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cl = allClients.find((x) => String(x.id) === String(btn.dataset.id));
        if (btn.dataset.act === 'edit') {
          const form = $('#clientForm');
          form.id.value = cl.id;
          form.name.value = cl.name;
          ensureOption(form.segment, cl.segment);
          form.initials.value = cl.initials;
          form.sort_order.value = cl.sort_order;
          form.is_active.value = String(cl.is_active);
          form.image_url.value = cl.image_url || '';
          form.image_alt.value = cl.image_alt || '';
          form.image_file.value = '';
          updateLogoPreview('clientPreview', 'clientPreviewImg', form.image_url.value);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          if (!confirm('Hapus klien ini?')) return;
          api(`/admin/clients/${btn.dataset.id}`, { method: 'DELETE' })
            .then(() => { toast('Klien dihapus'); loadClientsPartners(); })
            .catch((e) => toast(e.message));
        }
      });
    });
  }

  function renderPartners() {
    const tb = $('#partnerTable tbody');
    tb.innerHTML = allPartners.length ? allPartners.map((pr) => `
      <tr>
        <td>${pr.image_url ? `<img src="${escapeHtml(pr.image_url)}" alt="${escapeHtml(pr.image_alt || pr.name)}" style="width:96px;height:60px;object-fit:contain;border-radius:8px;border:1px solid var(--line);background:#f5f8fc" />` : '<small class="muted">Tanpa logo</small>'}</td>
        <td><strong>${escapeHtml(pr.name)}</strong><br><small>/${escapeHtml(pr.slug)}</small></td>
        <td>${escapeHtml(pr.category)}</td>
        <td>${escapeHtml(pr.description || '-')}</td>
        <td>${fmt(pr.sort_order)}</td>
        <td>${statusBadge(pr.is_active)}</td>
        <td>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${pr.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-act="del" data-id="${pr.id}">Hapus</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="7" class="muted">Belum ada mitra.</td></tr>';

    $$('#partnerTable [data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pr = allPartners.find((x) => String(x.id) === String(btn.dataset.id));
        if (btn.dataset.act === 'edit') {
          const form = $('#partnerForm');
          form.id.value = pr.id;
          form.name.value = pr.name;
          ensureOption(form.category, pr.category);
          form.description.value = pr.description || '';
          form.initials.value = pr.initials;
          form.sort_order.value = pr.sort_order;
          form.is_active.value = String(pr.is_active);
          form.image_url.value = pr.image_url || '';
          form.image_alt.value = pr.image_alt || '';
          form.image_file.value = '';
          updateLogoPreview('partnerPreview', 'partnerPreviewImg', form.image_url.value);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          if (!confirm('Hapus mitra ini?')) return;
          api(`/admin/partners/${btn.dataset.id}`, { method: 'DELETE' })
            .then(() => { toast('Mitra dihapus'); loadClientsPartners(); })
            .catch((e) => toast(e.message));
        }
      });
    });
  }

  $('#clientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      name: form.name.value,
      segment: form.segment.value,
      initials: form.initials.value,
      sort_order: num(form.sort_order.value),
      is_active: form.is_active.value === '1',
      image_url: form.image_url.value.trim(),
      image_alt: form.image_alt.value.trim()
    };
    try {
      const file = form.image_file.files && form.image_file.files[0];
      if (file) {
        const dataUrl = await readFileAsDataUrl(file);
        const up = await api('/admin/media/upload', { method: 'POST', body: { filename: file.name, dataUrl, folder: 'clients' } });
        body.image_url = up.url;
      }
      if (form.id.value) await api(`/admin/clients/${form.id.value}`, { method: 'PUT', body });
      else await api('/admin/clients', { method: 'POST', body });
      toast('Klien disimpan');
      form.reset();
      form.id.value = '';
      updateLogoPreview('clientPreview', 'clientPreviewImg', '');
      loadClientsPartners();
    } catch (err) { toast(err.message); }
  });

  $('#partnerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      name: form.name.value,
      category: form.category.value,
      description: form.description.value,
      initials: form.initials.value,
      sort_order: num(form.sort_order.value),
      is_active: form.is_active.value === '1',
      image_url: form.image_url.value.trim(),
      image_alt: form.image_alt.value.trim()
    };
    try {
      const file = form.image_file.files && form.image_file.files[0];
      if (file) {
        const dataUrl = await readFileAsDataUrl(file);
        const up = await api('/admin/media/upload', { method: 'POST', body: { filename: file.name, dataUrl, folder: 'partners' } });
        body.image_url = up.url;
      }
      if (form.id.value) await api(`/admin/partners/${form.id.value}`, { method: 'PUT', body });
      else await api('/admin/partners', { method: 'POST', body });
      toast('Mitra disimpan');
      form.reset();
      form.id.value = '';
      updateLogoPreview('partnerPreview', 'partnerPreviewImg', '');
      loadClientsPartners();
    } catch (err) { toast(err.message); }
  });

  $('#resetClient').addEventListener('click', () => {
    const form = $('#clientForm');
    form.reset();
    form.id.value = '';
    updateLogoPreview('clientPreview', 'clientPreviewImg', '');
  });

  $('#resetPartner').addEventListener('click', () => {
    const form = $('#partnerForm');
    form.reset();
    form.id.value = '';
    updateLogoPreview('partnerPreview', 'partnerPreviewImg', '');
  });

  /* ---------------- logo klien & mitra ---------------- */
  function updateLogoPreview(wrapId, imgId, url) {
    const wrap = document.getElementById(wrapId);
    const img = document.getElementById(imgId);
    if (!wrap || !img) return;
    if (url) {
      img.src = url;
      wrap.hidden = false;
    } else {
      img.removeAttribute('src');
      wrap.hidden = true;
    }
  }

  function bindLogoForm(formSel, folder, wrapId, imgId) {
    const form = $(formSel);
    if (!form) return;
    form.image_url.addEventListener('input', (e) => updateLogoPreview(wrapId, imgId, e.target.value.trim()));
    form.image_file.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => updateLogoPreview(wrapId, imgId, String(reader.result || ''));
      reader.readAsDataURL(file);
    });
  }

  /* =========================================================
     KARIER & OPEN PARTNER
     ========================================================= */
  let allJobs = [];
  let allPartnerPrograms = [];

  const JOB_TYPE_LABEL = {
    lowongan: 'Lowongan', magang: 'Magang', pkl: 'PKL'
  };

  async function loadCareers() {
    try {
      const [j, p] = await Promise.all([
        api('/admin/jobs'),
        api('/admin/partner-programs')
      ]);
      allJobs = j.jobs || [];
      allPartnerPrograms = p.programs || [];
      fillOptions($('#partnerProgramCategory'), p.categories || [], 'Technology');
      renderJobsTable();
      renderPartnerProgramsTable();
    } catch (e) {
      toast(e.message);
    }
  }

  /** Ubah array / teks multi-baris menjadi teks textarea. */
  function listToText(value) {
    if (Array.isArray(value)) return value.join('\n');
    return value || '';
  }

  function renderJobsTable() {
    const tb = $('#jobTable tbody');
    if (!tb) return;
    tb.innerHTML = allJobs.length ? allJobs.map((j) => `
      <tr>
        <td><strong>${escapeHtml(j.title)}</strong><br><small>/${escapeHtml(j.slug)}</small></td>
        <td><span class="badge badge--published">${escapeHtml(JOB_TYPE_LABEL[j.type] || j.type)}</span></td>
        <td>${escapeHtml(j.department || '-')}</td>
        <td>${escapeHtml(j.location || '-')}</td>
        <td>${escapeHtml(j.work_mode || '-')}</td>
        <td>${fmt(j.sort_order)}</td>
        <td>${statusBadge(j.is_active)}</td>
        <td>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${j.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-act="del" data-id="${j.id}">Hapus</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="8" class="muted">Belum ada lowongan.</td></tr>';

    $$('#jobTable [data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const job = allJobs.find((x) => String(x.id) === String(btn.dataset.id));
        if (btn.dataset.act === 'edit') {
          const form = $('#jobForm');
          form.id.value = job.id;
          form.title.value = job.title || '';
          form.type.value = job.type || 'lowongan';
          form.department.value = job.department || '';
          form.location.value = job.location || '';
          form.work_mode.value = job.work_mode || 'Onsite';
          form.employment.value = job.employment || 'Full-time';
          form.description.value = job.description || '';
          form.requirements.value = listToText(job.requirements);
          form.benefits.value = listToText(job.benefits);
          form.sort_order.value = job.sort_order;
          form.is_active.value = String(job.is_active);
          fillTranslations(form, 'job', job.translations);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          if (!confirm('Hapus lowongan ini?')) return;
          api(`/admin/jobs/${btn.dataset.id}`, { method: 'DELETE' })
            .then(() => { toast('Lowongan dihapus'); loadCareers(); })
            .catch((e) => toast(e.message));
        }
      });
    });
  }

  function renderPartnerProgramsTable() {
    const tb = $('#partnerProgramTable tbody');
    if (!tb) return;
    tb.innerHTML = allPartnerPrograms.length ? allPartnerPrograms.map((p) => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong><br><small>/${escapeHtml(p.slug)}</small></td>
        <td>${escapeHtml(p.category || '-')}</td>
        <td>${escapeHtml(p.cta_label || '-')}</td>
        <td>${fmt(p.sort_order)}</td>
        <td>${statusBadge(p.is_active)}</td>
        <td>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${p.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-act="del" data-id="${p.id}">Hapus</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted">Belum ada program kemitraan.</td></tr>';

    $$('#partnerProgramTable [data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prog = allPartnerPrograms.find((x) => String(x.id) === String(btn.dataset.id));
        if (btn.dataset.act === 'edit') {
          const form = $('#partnerProgramForm');
          form.id.value = prog.id;
          form.title.value = prog.title || '';
          ensureOption(form.category, prog.category);
          form.description.value = prog.description || '';
          form.benefits.value = listToText(prog.benefits);
          form.requirements.value = listToText(prog.requirements);
          form.cta_label.value = prog.cta_label || '';
          form.cta_url.value = prog.cta_url || '';
          form.sort_order.value = prog.sort_order;
          form.is_active.value = String(prog.is_active);
          fillTranslations(form, 'partnerProgram', prog.translations);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          if (!confirm('Hapus program kemitraan ini?')) return;
          api(`/admin/partner-programs/${btn.dataset.id}`, { method: 'DELETE' })
            .then(() => { toast('Program kemitraan dihapus'); loadCareers(); })
            .catch((e) => toast(e.message));
        }
      });
    });
  }

  $('#jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      title: form.title.value,
      type: form.type.value,
      department: form.department.value,
      location: form.location.value,
      work_mode: form.work_mode.value,
      employment: form.employment.value,
      description: form.description.value,
      requirements: form.requirements.value,
      benefits: form.benefits.value,
      sort_order: num(form.sort_order.value),
      is_active: form.is_active.value === '1',
      translations: collectTranslations(form, 'job')
    };
    try {
      if (form.id.value) {
        await api(`/admin/jobs/${form.id.value}`, { method: 'PUT', body });
      } else {
        await api('/admin/jobs', { method: 'POST', body });
      }
      toast(form.id.value ? 'Lowongan diperbarui' : 'Lowongan dibuat');
      form.reset();
      fillTranslations(form, 'job', null);
      loadCareers();
    } catch (err) {
      toast(err.message);
    }
  });

  $('#partnerProgramForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      title: form.title.value,
      category: form.category.value,
      description: form.description.value,
      benefits: form.benefits.value,
      requirements: form.requirements.value,
      cta_label: form.cta_label.value,
      cta_url: form.cta_url.value,
      sort_order: num(form.sort_order.value),
      is_active: form.is_active.value === '1',
      translations: collectTranslations(form, 'partnerProgram')
    };
    try {
      if (form.id.value) {
        await api(`/admin/partner-programs/${form.id.value}`, { method: 'PUT', body });
      } else {
        await api('/admin/partner-programs', { method: 'POST', body });
      }
      toast(form.id.value ? 'Program kemitraan diperbarui' : 'Program kemitraan dibuat');
      form.reset();
      fillTranslations(form, 'partnerProgram', null);
      loadCareers();
    } catch (err) {
      toast(err.message);
    }
  });

  $('#resetJob').addEventListener('click', () => {
    const form = $('#jobForm');
    form.reset();
    form.id.value = '';
    form.type.value = 'lowongan';
    form.work_mode.value = 'Onsite';
    form.employment.value = 'Full-time';
    fillTranslations(form, 'job', null);
  });

  $('#resetPartnerProgram').addEventListener('click', () => {
    const form = $('#partnerProgramForm');
    form.reset();
    form.id.value = '';
    fillTranslations(form, 'partnerProgram', null);
  });

  bindLogoForm('#clientForm', 'clients', 'clientPreview', 'clientPreviewImg');
  bindLogoForm('#partnerForm', 'partners', 'partnerPreview', 'partnerPreviewImg');

  /* ---------------- banner slideshow ---------------- */
  let allBanners = [];

  async function loadBanners() {
    const res = await api('/admin/banners');
    allBanners = res.banners || [];
    renderBanners();
  }

  function renderBanners() {
    const tb = $('#bannerTable tbody');
    tb.innerHTML = allBanners.length ? allBanners.map((b) => `
      <tr>
        <td>${b.image_url ? `<img src="${escapeHtml(b.image_url)}" alt="" style="width:110px;height:62px;object-fit:cover;border-radius:8px;border:1px solid var(--line)" />` : '<small class="muted">Tanpa gambar</small>'}</td>
        <td><strong>${escapeHtml(b.title)}</strong>${b.eyebrow ? `<br><small>${escapeHtml(b.eyebrow)}</small>` : ''}</td>
        <td><small>/${escapeHtml(b.slug)}</small></td>
        <td>${fmt(b.sort_order)}</td>
        <td>${statusBadge(b.is_active)}</td>
        <td>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${b.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-act="del" data-id="${b.id}">Hapus</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted">Belum ada slide banner.</td></tr>';

    $$('#bannerTable [data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const b = allBanners.find((x) => String(x.id) === String(btn.dataset.id));
        if (!b) return;
        if (btn.dataset.act === 'edit') {
          const form = $('#bannerForm');
          form.id.value = b.id;
          form.title.value = b.title || '';
          form.title_highlight.value = b.title_highlight || '';
          form.eyebrow.value = b.eyebrow || '';
          form.slug.value = b.slug || '';
          form.description.value = b.description || '';
          form.cta_label.value = b.cta_label || '';
          form.cta_url.value = b.cta_url || '';
          form.cta2_label.value = b.cta2_label || '';
          form.cta2_url.value = b.cta2_url || '';
          form.accent.value = b.accent || '';
          form.visual_title.value = b.visual_title || '';
          form.visual_label.value = b.visual_label || '';
          form.visual_caption.value = b.visual_caption || '';
          form.chips.value = Array.isArray(b.chips) ? b.chips.join(', ') : (b.chips || '');
          const badges = Array.isArray(b.badges) ? b.badges : [];
          form.badges.value = badges.map((x) => `${x.v || ''}|${x.l || ''}`).join('\n');
          form.sort_order.value = b.sort_order;
          form.is_active.value = String(b.is_active);
          form.image_url.value = b.image_url || '';
          form.image_alt.value = b.image_alt || '';
          form.show_caption.value = String(Number(b.show_caption) === 1 ? '1' : '0');
          fillTranslations(form, 'banner', b.translations);
          form.image_file.value = '';
          updateBannerPreview(form.image_url.value);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          if (!confirm('Hapus slide banner ini?')) return;
          api(`/admin/banners/${btn.dataset.id}`, { method: 'DELETE' })
            .then(() => { toast('Slide banner dihapus'); loadBanners(); })
            .catch((e) => toast(e.message));
        }
      });
    });
  }

  /* =========================================================
     Terjemahan EN / JA — pembantu bersama
     ========================================================= */

  /** Kolom yang boleh diterjemahkan per entitas. */
  const TRANS_FIELDS = {
    banner: ['title', 'title_highlight', 'eyebrow', 'description', 'cta_label', 'cta2_label',
      'visual_title', 'visual_label', 'visual_caption', 'image_alt', 'chips'],
    article: ['title', 'excerpt', 'content', 'category', 'tags', 'seo_title', 'seo_description'],
    job: ['title', 'department', 'location', 'description', 'requirements', 'benefits'],
    partnerProgram: ['title', 'category', 'description', 'benefits', 'requirements', 'cta_label']
  };

  /**
   * Baca input t_<lang>_<field> dari form dan susun objek translations.
   * Mengembalikan null bila seluruh kolom kosong (biar kolom DB tetap bersih).
   */
  function collectTranslations(form, kind) {
    const fields = TRANS_FIELDS[kind] || [];
    const out = {};
    ['en', 'ja'].forEach((lang) => {
      const bag = {};
      fields.forEach((f) => {
        const input = form['t_' + lang + '_' + f];
        if (!input) return;
        const val = String(input.value || '').trim();
        if (val) bag[f] = val;
      });
      if (Object.keys(bag).length) out[lang] = bag;
    });
    return Object.keys(out).length ? out : null;
  }

  /** Isi input t_<lang>_<field> dari objek translations milik entitas. */
  function fillTranslations(form, kind, translations) {
    const fields = TRANS_FIELDS[kind] || [];
    let bag = translations;
    if (typeof bag === 'string') { try { bag = JSON.parse(bag); } catch { bag = null; } }
    if (!bag || typeof bag !== 'object') bag = {};
    ['en', 'ja'].forEach((lang) => {
      const src = bag[lang] && typeof bag[lang] === 'object' ? bag[lang] : {};
      fields.forEach((f) => {
        const input = form['t_' + lang + '_' + f];
        if (!input) return;
        const val = src[f];
        if (val === undefined || val === null) { input.value = ''; return; }
        /* Array (dari DB) diserialkan dengan baris baru agar cocok dengan
           textarea multi-baris; string disimpan apa adanya. */
        input.value = Array.isArray(val) ? val.join('\n') : String(val);
      });
    });
    const block = form.querySelector('[data-trans-block="' + kind + '"]');
    if (block) block.open = Object.keys(bag).length > 0;
  }

  $('#bannerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      title: form.title.value,
      title_highlight: form.title_highlight.value,
      eyebrow: form.eyebrow.value,
      slug: form.slug.value,
      description: form.description.value,
      cta_label: form.cta_label.value,
      cta_url: form.cta_url.value,
      cta2_label: form.cta2_label.value,
      cta2_url: form.cta2_url.value,
      accent: form.accent.value,
      visual_title: form.visual_title.value,
      visual_label: form.visual_label.value,
      visual_caption: form.visual_caption.value,
      chips: form.chips.value,
      badges: form.badges.value,
      sort_order: num(form.sort_order.value),
      is_active: form.is_active.value === '1',
      image_url: form.image_url.value,
      image_alt: form.image_alt.value,
      show_caption: form.show_caption.value === '1',
      translations: collectTranslations(form, 'banner')
    };
    try {
      const file = form.image_file.files && form.image_file.files[0];
      if (file) {
        const dataUrl = await readFileAsDataUrl(file);
        const up = await api('/admin/banners/upload', { method: 'POST', body: { filename: file.name, dataUrl } });
        body.image_url = up.url;
      }
      if (form.id.value) await api(`/admin/banners/${form.id.value}`, { method: 'PUT', body });
      else await api('/admin/banners', { method: 'POST', body });
      toast('Slide banner disimpan');
      form.reset();
      form.id.value = '';
      form.show_caption.value = '0';
      updateBannerPreview('');
      loadBanners();
    } catch (err) { toast(err.message); }
  });

  $('#resetBanner').addEventListener('click', () => {
    const form = $('#bannerForm');
    form.reset();
    form.id.value = '';
    form.show_caption.value = '0';
    fillTranslations(form, 'banner', null);
    updateBannerPreview('');
  });

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('gagal membaca berkas gambar'));
      reader.readAsDataURL(file);
    });
  }

  function updateBannerPreview(url) {
    const wrap = $('#bannerPreview');
    const img = $('#bannerPreviewImg');
    if (!wrap || !img) return;
    if (url) {
      img.src = url;
      wrap.hidden = false;
    } else {
      img.removeAttribute('src');
      wrap.hidden = true;
    }
  }

  $('#bannerForm').image_url.addEventListener('input', (e) => updateBannerPreview(e.target.value.trim()));
  $('#bannerForm').image_file.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    updateBannerPreview('');
    const reader = new FileReader();
    reader.onload = () => updateBannerPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

  /* ---------------- analitik ---------------- */
  async function loadAnalytics() {
    const days = $('#rangeDays').value;
    const [dash, pages, series] = await Promise.all([
      api('/admin/dashboard'),
      api(`/admin/analytics/pages?days=${days}`),
      api(`/admin/analytics/timeseries?days=${days}`)
    ]);
    const s = dash.summary || {};
    $('#kpiAnalytics').innerHTML = `
      <div class="kpi"><div class="kpi__label">Page View</div><div class="kpi__value">${fmt(s.pv_30d)}</div><div class="kpi__hint">30 hari</div></div>
      <div class="kpi"><div class="kpi__label">Pengunjung Unik</div><div class="kpi__value">${fmt(s.visitors_30d)}</div><div class="kpi__hint">30 hari</div></div>
      <div class="kpi"><div class="kpi__label">Durasi Rata-rata</div><div class="kpi__value">${fmt(Math.round(s.avg_duration))} dtk</div><div class="kpi__hint">per kunjungan</div></div>
      <div class="kpi"><div class="kpi__label">Event</div><div class="kpi__value">${fmt(s.events_30d)}</div><div class="kpi__hint">tercatat</div></div>`;

    $('#hourChart').innerHTML = columnChart(series.rows || [], 'hour', 'views');
    $('#hourChart').classList.add('chart--hour');
    $('#channelList').innerHTML = barList(pages.rows || [], 'path', 'views');
    $('#eventList').innerHTML = barList(dash.events || [], 'event_name', 'total');
  }

  $('#refreshAnalytics').addEventListener('click', () => loadAnalytics().catch((e) => toast(e.message)));
  $('#rangeDays').addEventListener('change', () => loadAnalytics().catch((e) => toast(e.message)));

  /* ---------------- analisa indikator ---------------- */
  const IND_STATUS_CLASS = { ok: 'ok', warn: 'warn', bad: 'bad' };
  const IND_PRIORITY_CLASS = { tinggi: 'ind-prio--tinggi', sedang: 'ind-prio--sedang', rendah: 'ind-prio--rendah' };

  function indGauge(el, score) {
    if (!el) return;
    const s = Math.max(0, Math.min(100, num(score)));
    el.textContent = s;
    el.style.background = `conic-gradient(var(--blue) ${s}%, var(--line) ${s}%)`;
  }

  function indMetricRow(m) {
    const cls = IND_STATUS_CLASS[m.status] || 'warn';
    const icon = m.status === 'ok' ? 'bi-check-lg' : m.status === 'bad' ? 'bi-x-lg' : 'bi-exclamation-lg';
    return `<div class="check">
      <span class="mark ${cls}"><i class="bi ${icon}"></i></span>
      <span><b>${escapeHtml(m.name)}</b> <small>— ${escapeHtml(String(m.value))} / target ${escapeHtml(m.target)}${m.detail ? ` · ${escapeHtml(m.detail)}` : ''}</small></span>
    </div>`;
  }

  async function loadIndicators() {
    const days = $('#indDays').value;
    const d = await api(`/admin/indicators?days=${days}`);

    indGauge($('#indOverall'), d.overall.score);

    const sections = d.sections || [];
    $('#indOverallInfo').innerHTML = `
      <div class="check"><span class="mark ok"><i class="bi bi-clipboard-data"></i></span>
        <span><b>Skor ${d.overall.score}/100</b> <small>— Grade ${d.overall.grade}: ${escapeHtml(d.overall.label)}</small></span></div>
      <div class="check"><span class="mark ok"><i class="bi bi-calendar3"></i></span>
        <span><b>Periode ${d.days} hari</b> <small>— ${fmt((d.issues || []).length)} isu terdeteksi</small></span></div>
      ${sections.map((s) => `<div class="check"><span class="mark ${s.score >= 75 ? 'ok' : s.score >= 50 ? 'warn' : 'bad'}"><i class="bi bi-dot"></i></span>
        <span><b>${escapeHtml(s.label)}</b> <small>— ${s.score}/100 (grade ${escapeHtml(s.grade)}, bobot ${s.weight}%)</small></span></div>`).join('')}`;

    $('#indSectionCards').innerHTML = sections.map((s) => `
      <div class="ind-card">
        <div class="score score--sm" data-ind-score="${s.key}">${s.score}</div>
        <div class="ind-card__meta">
          <strong><i class="bi ${escapeHtml(s.icon)}"></i> ${escapeHtml(s.label)}</strong>
          <span class="badge ${s.score >= 75 ? 'badge--published' : s.score >= 50 ? 'badge--draft' : 'badge--lost'}">Grade ${escapeHtml(s.grade)}</span>
          <small class="muted">${escapeHtml(s.gradeLabel)} · bobot ${s.weight}%</small>
        </div>
      </div>`).join('');

    sections.forEach((s) => {
      indGauge(document.querySelector(`[data-ind-score="${s.key}"]`), s.score);
    });

    $('#indMetrics').innerHTML = sections.map((s) => `
      <div class="ind-block">
        <h4><i class="bi ${escapeHtml(s.icon)}"></i> ${escapeHtml(s.label)}
          <span class="badge ${s.score >= 75 ? 'badge--published' : s.score >= 50 ? 'badge--draft' : 'badge--lost'}">${s.score}/100</span></h4>
        <div class="checks">${(s.metrics || []).map(indMetricRow).join('')}</div>
      </div>`).join('');

    // Tren
    const trend = (d.performa && d.performa.trend) || [];
    $('#indTrend').innerHTML = trend.length
      ? columnChart(trend.map((t) => ({ day: String(t.day).slice(5), views: t.views })), 'day', 'views')
      : '<p class="muted">Belum ada data trafik pada periode ini.</p>';
    $('#indTrend').classList.add('chart--hour');

    $('#indDevices').innerHTML = barList((d.performa && d.performa.devices) || [], 'label', 'value');

    // Tabel halaman
    $('#indTopPages tbody').innerHTML = ((d.performa && d.performa.topPages) || []).map((p) => `
      <tr><td>${escapeHtml(p.path || '-')}</td><td>${fmt(p.views)}</td><td>${fmt(p.visitors)}</td><td>${fmt(p.avgDuration)} dtk</td></tr>`
    ).join('') || '<tr><td colspan="4" class="muted">Belum ada data.</td></tr>';

    $('#indSlowPages tbody').innerHTML = ((d.performa && d.performa.slowPages) || []).map((p) => `
      <tr><td>${escapeHtml(p.path || '-')}</td><td>${fmt(p.views)}</td><td>${fmt(p.avgDuration)} dtk</td></tr>`
    ).join('') || '<tr><td colspan="3" class="muted">Belum ada data.</td></tr>';

    // Kata kunci
    $('#indKwDist').innerHTML = barList((d.keywords && d.keywords.distribution) || [], 'label', 'value');
    $('#indKeywords tbody').innerHTML = ((d.keywords && d.keywords.items) || []).map((k) => {
      const delta = num(k.delta);
      const dcls = delta > 0 ? 'ind-delta--up' : delta < 0 ? 'ind-delta--down' : '';
      const dtxt = delta > 0 ? `↑ ${delta}` : delta < 0 ? `↓ ${Math.abs(delta)}` : '—';
      return `<tr>
        <td>${escapeHtml(k.keyword || '-')}<br><small>${escapeHtml(k.intent || '')}</small></td>
        <td><strong>${k.currentRank == null ? 'n/a' : k.currentRank}</strong></td>
        <td>${fmt(k.searchVolume)}</td>
        <td class="${dcls}">${dtxt}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" class="muted">Belum ada kata kunci.</td></tr>';

    // Konten
    $('#indCategories').innerHTML = barList((d.konten && d.konten.categories) || [], 'label', 'value');
    $('#indArticles tbody').innerHTML = ((d.konten && d.konten.articles) || []).map((a) => `
      <tr>
        <td><strong>${escapeHtml(a.title || a.slug)}</strong><br><small>${escapeHtml(a.status || '')} · ${fmt(a.views)} views</small></td>
        <td>${fmt(a.wordCount)}</td>
        <td><strong>${a.score}</strong>/100</td>
        <td class="muted">${escapeHtml((a.issues || []).join(', ') || '—')}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="muted">Belum ada artikel.</td></tr>';

    // Prioritas perbaikan
    $('#indIssues tbody').innerHTML = (d.issues || []).map((i) => `
      <tr>
        <td><span class="ind-prio ${IND_PRIORITY_CLASS[i.priority] || 'ind-prio--rendah'}">${escapeHtml(i.priority)}</span></td>
        <td>${escapeHtml(i.area)}</td>
        <td><strong>${escapeHtml(i.title)}</strong></td>
        <td class="muted">${escapeHtml(i.detail || '')}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="muted">Tidak ada isu terdeteksi. Bagus!</td></tr>';

    $('#indGeneratedAt').textContent = `Diperbarui ${new Date(d.generatedAt).toLocaleString('id-ID')}`;
  }

  $('#refreshIndicators').addEventListener('click', () => loadIndicators().catch((e) => toast(e.message)));
  $('#indDays').addEventListener('change', () => loadIndicators().catch((e) => toast(e.message)));

  /* ---------------- leads ---------------- */
  async function loadLeads() {
    const res = await api('/admin/leads');
    const tb = $('#leadTable tbody');
    tb.innerHTML = res.leads.length ? res.leads.map((l) => `
      <tr>
        <td><strong>${escapeHtml(l.full_name)}</strong></td>
        <td>${escapeHtml(l.company || '-')}</td>
        <td>${escapeHtml(l.email)}<br><small>${escapeHtml(l.phone || '')}</small></td>
        <td>${escapeHtml(l.service || l.sector || '-')}</td>
        <td>
          <select class="lead-status" data-id="${l.id}">
            ${['new', 'contacted', 'won', 'lost'].map((s) => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>${escapeHtml(String(l.created_at || '').slice(0, 16))}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted">Belum ada lead.</td></tr>';

    $$('.lead-status').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try {
          await api(`/admin/leads/${sel.dataset.id}`, { method: 'PUT', body: { status: sel.value } });
          toast('Status lead diperbarui');
        } catch (e) { toast(e.message); }
      });
    });
  }

  /* ---------------- start ---------------- */
  async function startApp() {
    try {
      const me = await api('/admin/me');
      $('#whoami').textContent = me.user.full_name || me.user.username;
    } catch {
      return;
    }
    $('#loginScreen').hidden = true;
    $('#appScreen').hidden = false;
    try {
      await loadSettings();
    } catch { /* abaikan */ }
    showView(currentView);
  }

  if (token) {
    startApp().catch(() => logout(false));
  }
})();
