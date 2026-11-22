/* =========================================================
   ITV i18n Engine — multi bahasa (ID / EN / JA)
   ---------------------------------------------------------
   Tanpa build step. Kamus dimuat via window.ITV_I18N_DATA
   (public/i18n-data.js) sebelum file ini.

   Struktur kamus per bahasa:
     t : { "<teks sumber>": "<terjemahan>" }      teks statis (leaf)
     h : { "<key>": "<HTML terjemahan>" }         innerHTML eksplisit
     a : { "<nilai atribut>": "<terjemahan>" }    atribut
     m : { title, description, keywords, ogTitle, ogDescription }
     c : { "<slug>": { "<field>": "<terjemahan>" } } konten dari DB

   Mode elemen:
     1. leaf (tanpa anak elemen)      -> dicocokkan via kamus "t"
     2. data-i18n="key"               -> seluruh innerHTML diganti (kamus "h")
     3. data-i18n-text="key"          -> hanya teks langsung (kamus "h"/"t")
   ========================================================= */
(function (global, document) {
  'use strict';

  var DATA = global.ITV_I18N_DATA || {};
  var LANGS = ['id', 'en', 'ja'];
  var DEFAULT_LANG = 'id';
  var STORAGE_KEY = 'itv_lang';

  var SKIP_TAGS = {
    SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, IFRAME: 1, CODE: 1, PRE: 1
  };

  var state = { lang: DEFAULT_LANG, listeners: [], switcherReady: false };

  /* ---------- util ---------- */
  function norm(v) {
    return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim();
  }

  function sec(lang, name) {
    var d = DATA[lang];
    if (!d) return null;
    var s = d[name];
    return s && typeof s === 'object' ? s : null;
  }

  function lookup(lang, name, key) {
    var s = sec(lang, name);
    if (!s) return undefined;
    return Object.prototype.hasOwnProperty.call(s, key) ? s[key] : undefined;
  }

  function interpolate(value, vars) {
    if (typeof value === 'function') {
      try { return value(vars || {}); } catch (e) { return ''; }
    }
    if (!vars) return value;
    return String(value).replace(/\{(\w+)\}/g, function (m, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
    });
  }

  /* ---------- API publik ---------- */
  var ITV = {
    LANGS: LANGS,
    DEFAULT_LANG: DEFAULT_LANG,

    get lang() { return state.lang; },

    getLang: function () { return state.lang; },

    /** Terjemahkan teks statis (kamus "t"). Key = teks sumber apa adanya. */
    t: function (key, vars) {
      var k = norm(key);
      if (!k) return key === undefined || key === null ? '' : String(key);
      var v = lookup(state.lang, 't', k);
      if (v === undefined) v = lookup('en', 't', k);
      if (v === undefined) return key;
      return interpolate(v, vars);
    },

    /** Terjemahkan string HTML (kamus "h", fallback ke "t"). */
    th: function (html, vars) {
      var k = norm(html);
      if (!k) return html === undefined || html === null ? '' : String(html);
      var v = lookup(state.lang, 'h', k);
      if (v === undefined) v = lookup(state.lang, 't', k);
      if (v === undefined) return html;
      return interpolate(v, vars);
    },

    /** Pesan runtime dari script.js (kamus "j"). */
    tm: function (key, vars) {
      var k = norm(key);
      if (!k) return key;
      /* Bahasa default: teks Indonesia adalah sumbernya, jangan pernah
         menerjemahkannya ke bahasa lain. */
      if (state.lang === DEFAULT_LANG) return interpolate(key, vars);
      var v = lookup(state.lang, 'j', k);
      if (v === undefined) v = lookup('en', 'j', k);
      if (v === undefined) return interpolate(key, vars);
      return interpolate(v, vars);
    },

    /** Terjemahkan konten dinamis dari DB (kamus "c"): key = slug/identifier. */
    tc: function (key, field, fallback) {
      var k = norm(key);
      var c = sec(state.lang, 'c');
      var v = c ? c[k] : null;
      if (v && Object.prototype.hasOwnProperty.call(v, field)) return interpolate(v[field], {});
      if (state.lang !== 'en') {
        var ce = sec('en', 'c');
        var ve = ce ? ce[k] : null;
        if (ve && Object.prototype.hasOwnProperty.call(ve, field)) return interpolate(ve[field], {});
      }
      return fallback;
    },

    /** Terjemahkan nilai atribut (kamus "a", fallback ke "t"). */
    ta: function (value) {
      var k = norm(value);
      if (!k) return value;
      var v = lookup(state.lang, 'a', k);
      if (v === undefined) v = lookup(state.lang, 't', k);
      if (v === undefined) return value;
      return v;
    },

    setLang: function (lang) {
      lang = String(lang || '').toLowerCase();
      if (LANGS.indexOf(lang) === -1) lang = DEFAULT_LANG;
      if (lang === state.lang) { updateSwitcher(); return lang; }
      state.lang = lang;
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
      if (document.documentElement) document.documentElement.setAttribute('lang', lang);
      apply();
      updateSwitcher();
      for (var i = 0; i < state.listeners.length; i++) {
        try { state.listeners[i](lang); } catch (e) {}
      }
      return lang;
    },

    onChange: function (fn) {
      if (typeof fn === 'function') state.listeners.push(fn);
      return function () {
        var i = state.listeners.indexOf(fn);
        if (i > -1) state.listeners.splice(i, 1);
      };
    },

    apply: apply,

    /* Simpan nilai meta sumber (dari database) agar bisa diterjemahkan. */
    setMetaSource: setMetaSource
  };

  /* ---------- elemen ---------- */
  function collect(scope) {
    var out = [scope];
    if (scope.querySelectorAll) {
      var nodes = scope.querySelectorAll('*');
      for (var i = 0; i < nodes.length; i++) out.push(nodes[i]);
    }
    return out;
  }

  function directTextNodes(el) {
    var out = [];
    var kids = el.childNodes || [];
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].nodeType === 3) out.push(kids[i]);
    }
    return out;
  }

  function hasElementChild(el) {
    var kids = el.childNodes || [];
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].nodeType === 1) return true;
    }
    return false;
  }

  /** Kembalikan elemen ke kondisi semula sebelum terjemahan ulang. */
  function restore(el) {
    if (el.__itvHtml !== undefined) {
      el.innerHTML = el.__itvHtml;
      el.__itvHtml = undefined;
    } else if (el.__itvDirect) {
      var saved = el.__itvDirect;
      for (var i = 0; i < saved.length; i++) {
        if (saved[i].node && saved[i].node.parentNode === el) {
          saved[i].node.nodeValue = saved[i].text;
        }
      }
      el.__itvDirect = null;
    } else if (el.__itvText !== undefined) {
      el.textContent = el.__itvText;
      el.__itvText = undefined;
    }
  }

  function translateElement(el, lang) {
    if (SKIP_TAGS[el.tagName]) return;
    if (!el.getAttribute) return;
    if (el.hasAttribute('data-brand')) return;
    if (el.closest && el.closest('[data-i18n-ignore]')) return;

    /* mode 2: ganti seluruh isi (innerHTML) */
    var full = el.getAttribute('data-i18n');
    if (full) {
      var kFull = norm(full);
      var vFull = lookup(lang, 'h', kFull);
      if (vFull === undefined) vFull = lookup(lang, 't', kFull);
      if (vFull !== undefined) {
        if (el.__itvHtml === undefined) el.__itvHtml = el.innerHTML;
        el.innerHTML = vFull;
      }
      return;
    }

    /* mode 3: ganti teks langsung saja, anak elemen dipertahankan */
    var direct = el.getAttribute('data-i18n-text');
    if (direct) {
      var kDirect = norm(direct);
      var vDirect = lookup(lang, 'h', kDirect);
      if (vDirect === undefined) vDirect = lookup(lang, 't', kDirect);
      if (vDirect !== undefined) {
        var nodes = directTextNodes(el);
        if (nodes.length) {
          if (!el.__itvDirect) {
            el.__itvDirect = [];
            for (var i = 0; i < nodes.length; i++) {
              el.__itvDirect.push({ node: nodes[i], text: nodes[i].nodeValue });
            }
          }
          var first = nodes[0];
          var orig = first.nodeValue || '';
          var lead = (orig.match(/^\s*/) || [''])[0];
          var tail = (orig.match(/\s*$/) || [''])[0];
          first.nodeValue = lead + vDirect + tail;
          for (var j = 1; j < nodes.length; j++) nodes[j].nodeValue = '';
        }
      }
      return;
    }

    /* mode 1: leaf element */
    if (hasElementChild(el)) return;
    var txt = el.textContent;
    if (!norm(txt)) return;
    var kLeaf = norm(txt);
    var vLeaf = lookup(lang, 't', kLeaf);
    if (vLeaf !== undefined && vLeaf !== txt) {
      if (el.__itvText === undefined) el.__itvText = txt;
      el.textContent = vLeaf;
    }
  }

  function translateAttributes(el, lang) {
    var attrs = ['placeholder', 'aria-label', 'alt', 'title'];
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i];
      if (!el.hasAttribute(name)) continue;
      var cur = el.getAttribute(name);
      if (!norm(cur)) continue;
      if (!el.__itvAttr) el.__itvAttr = {};
      if (el.__itvAttr[name] === undefined) el.__itvAttr[name] = cur;
      var source = el.__itvAttr[name];
      var translated = lookup(lang, 'a', norm(source));
      if (translated === undefined) translated = lookup(lang, 't', norm(source));
      if (translated !== undefined) el.setAttribute(name, translated);
    }
  }

  /* ---------- meta ---------- */
  var META_TARGETS = [
    { sel: 'meta[name="description"]', key: 'description', attr: 'content' },
    { sel: 'meta[name="keywords"]', key: 'keywords', attr: 'content' },
    { sel: 'meta[property="og:title"]', key: 'ogTitle', attr: 'content' },
    { sel: 'meta[property="og:description"]', key: 'ogDescription', attr: 'content' }
  ];

  /* Simpan nilai sumber (Indonesia) yang ditulis runtime, supaya tetap bisa
     diterjemahkan walau konten berasal dari database. */
  var META_SOURCE = {};

  function applyMeta(lang) {
    if (!document.head) return;
    var titleKey = META_SOURCE.title !== undefined ? META_SOURCE.title : lookup(lang, 'm', 'title');
    if (titleKey !== undefined) document.title = lookup(lang, 'm', titleKey) || titleKey;
    for (var i = 0; i < META_TARGETS.length; i++) {
      var t = META_TARGETS[i];
      var node = document.head.querySelector(t.sel);
      if (!node) continue;
      var raw = META_SOURCE[t.key] !== undefined ? META_SOURCE[t.key] : lookup(lang, 'm', t.key);
      if (raw === undefined) continue;
      node.setAttribute(t.attr, lookup(lang, 'm', raw) || raw);
    }
  }

  /* Dipakai script.js setelah SEO dari database diterapkan. */
  function setMetaSource(values) {
    if (!values) return;
    Object.keys(values).forEach(function (k) {
      var v = values[k];
      if (v === undefined || v === null || v === '') return;
      META_SOURCE[k] = norm(String(v));
    });
    applyMeta(state.lang);
  }

  /* ---------- apply ---------- */
  function apply(root) {
    var lang = state.lang;
    var scope = root || document.body;
    if (!scope) return;

    var all = collect(scope);
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.isConnected) restore(el);
    }

    /* Bahasa default: sumber sudah Bahasa Indonesia, tidak perlu diubah. */
    if (lang !== DEFAULT_LANG) {
      all = collect(scope);
      for (var j = 0; j < all.length; j++) {
        var node = all[j];
        if (!node.isConnected) continue;
        translateElement(node, lang);
        translateAttributes(node, lang);
      }
      applyMeta(lang);
    }

    refreshYear();
  }

  /** Perbarui tahun footer setelah innerHTML diganti. */
  function refreshYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------- switcher ---------- */
  function updateSwitcher() {
    var label = document.querySelector('[data-lang-current]');
    if (label) label.textContent = state.lang.toUpperCase();
    var buttons = document.querySelectorAll('[data-lang-switch] [data-lang]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var on = b.getAttribute('data-lang') === state.lang;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.classList.toggle('is-active', on);
    }
  }

  function closePanels(root) {
    if (!root) return;
    root.classList.remove('is-open');
    var toggle = root.querySelector('[data-lang-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function initSwitcher() {
    if (state.switcherReady) return;
    var root = document.querySelector('[data-lang-switch]');
    if (!root) return;
    state.switcherReady = true;

    root.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-lang]') : null;
      if (btn) {
        e.preventDefault();
        ITV.setLang(btn.getAttribute('data-lang'));
        closePanels(root);
        return;
      }
      var toggle = e.target.closest ? e.target.closest('[data-lang-toggle]') : null;
      if (toggle) {
        e.preventDefault();
        var open = root.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    });

    document.addEventListener('click', function (e) {
      if (root.contains(e.target)) return;
      closePanels(root);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closePanels(root);
    });
  }

  /* ---------- init ---------- */
  function detectLang() {
    try {
      var q = new URLSearchParams(global.location.search).get('lang');
      if (q) {
        q = String(q).toLowerCase();
        if (LANGS.indexOf(q) > -1) return q;
      }
    } catch (e) {}
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && LANGS.indexOf(stored) > -1) return stored;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function boot() {
    state.lang = detectLang();
    if (document.documentElement) document.documentElement.setAttribute('lang', state.lang);
    initSwitcher();
    updateSwitcher();
    apply();
  }

  global.ITV = ITV;
  ITV._apply = apply;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);
