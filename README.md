# PT. Integration Teknologi Visual — Website Korporat + CMS + MySQL

Website landing page perusahaan **PT. Integration Teknologi Visual** (mitra transformasi digital:
software enterprise, digital signage, interactive display, dan integrasi sistem), dilengkapi
**REST API berbasis Node/Express**, **database MySQL (MariaDB)**, dan **portal CMS** untuk
manajemen konten, SEO, branding, dan analisis pengunjung.

---

## 1. Fitur

### Website publik (`/`)
- **Halaman korporat** (HTML5/CSS3/vanilla JS, tanpa build step): hero, layanan, produk,
  sektor, insight, proses, garansi, dan form konsultasi.
- **Banner slideshow (hero carousel)**: 4 slide otomatis (rotasi 6 detik) dengan tombol
  panah, indikator titik + progres animasi, swipe sentuh, navigasi keyboard, pause saat hover/fokus,
  dan dukungan `prefers-reduced-motion`.
- **Slide banner gambar penuh (image-only)**: tiap slide dapat memakai satu gambar full-bleed
  (`image_url`) dengan teks alternatif (`image_alt`) untuk aksesibilitas & SEO. Judul slide tetap
  ada sebagai heading tersembunyi (`visually-hidden`) sehingga struktur SEO/a11y tidak hilang.
  Opsional `show_caption=1` menampilkan overlay teks (eyebrow, judul, deskripsi, CTA) di atas gambar.
- **Klien** (section `#klien`): grid logo klien per industri — **hanya gambar logo** (tanpa teks
  keterangan), dirender dari MySQL (`GET /api/clients`) dengan fallback markup statis.
- **Mitra** (section `#mitra`, terpisah dari Klien): grid logo mitra/ekosistem teknologi — **hanya
  gambar logo** — pada bagian berlatar lembut sendiri.
- **Konten dinamis dari MySQL**: kartu layanan, produk, sektor, klien, mitra, dan artikel dirender dari
  database (dengan fallback markup statis bila API tidak terjangkau).
- **SEO & branding otomatis dari CMS**: `<title>`, meta description/keywords, Open Graph,
  Twitter Card, canonical, JSON-LD Schema.org, `robots.txt`, dan `sitemap.xml` diambil dari
  pengaturan `seo.*` di CMS; warna & identitas perusahaan dari `brand.*`.
- **Artikel**: grid artikel di landing page + halaman detail [public/artikel.html](public/artikel.html).
- **Analitik ringan**: pageview, durasi kunjungan, dan event klik CTA terkirim ke API.
- **Lead capture**: form Permintaan Konsultasi → `POST /api/leads` → tabel `leads`.

### Portal CMS (`/admin`)
- **Login** dengan session token (Bearer) + tabel `cms_sessions`.
- **Dashboard**: KPI pageview 30 hari, pengunjung unik, rata-rata durasi, lead, artikel, kata kunci, klien/mitra.
- **Analitik pengunjung**: pageview per halaman, timeseries, sumber/referrer, perangkat, browser, OS.
- **Manajemen artikel**: CRUD lengkap (judul, slug, ringkasan, konten, cover, kategori, tag,
  status draft/published, tanggal terbit), plus skor SEO per artikel.
- **Konfigurasi SEO**: meta title/description/keywords, canonical, OG image, Twitter Card,
  robots.txt, sitemap, Google Site Verification, Schema.org JSON-LD + audit/skor otomatis.
- **Konfigurasi branding**: nama perusahaan, logo text, tagline, warna utama/sekunder/gelap,
  email, telepon, website, alamat + pratinjau langsung (live preview).
- **Indikator website**: skor SEO (0–100), daftar pemeriksaan, dan metrik SEO per artikel.
- **Indikator kata kunci**: CRUD target keyword (volume, difficulty, rank, URL target, intent,
  status) + pencatatan riwayat peringkat.
- **Manajemen lead**: daftar prospek beserta perubahan status (`new`, `contacted`, `won`, `lost`).
- **Manajemen Klien & Mitra**: CRUD penuh untuk tabel `clients` (nama, segmen, monogram, URL logo,
  teks alt logo, urutan, status aktif) dan `partners` (nama, kategori, deskripsi, monogram, URL logo,
  teks alt logo, urutan, status aktif) — perubahan langsung tampil pada section `#klien` dan `#mitra`
  di landing page. Slug dibuat otomatis dan dijamin unik.
- **Logo Klien & Mitra**: gambar logo dapat diisi lewat **URL** (`image_url`) atau diunggah langsung
  dari CMS (input *Upload Logo* → `POST /api/admin/media/upload`, maks 5 MB, format png/jpg/webp/gif/svg)
  dan tersimpan di `public/uploads/clients/` atau `public/uploads/partners/`. Pratinjau logo
  tampil di form dan thumbnail di tabel.
- **Manajemen Banner Slideshow**: CRUD penuh untuk slide hero carousel (judul + highlight, eyebrow,
  deskripsi ber-HTML, dua CTA, panel visual, warna aksen, chips, badges, urutan, status aktif) —
  perubahan langsung tampil pada hero landing page. Slug dibuat otomatis dan dijamin unik.
- **Mode gambar pada banner**: setiap slide dapat diatur menjadi **murni gambar** (tanpa teks
  di atas gambar) atau gambar + caption teks. Gambar bisa diisi lewat **URL** (`image_url`) atau
  diunggah langsung dari CMS (tombol *Upload Gambar* → `POST /api/admin/banners/upload`, maks 5 MB,
  format png/jpg/webp/gif/svg) dan tersimpan di `public/uploads/banners/`. Pratinjau gambar
  langsung tampil di form.

---

## 2. Menjalankan secara lokal

```bash
# 1. Install dependensi
npm install

# 2. Siapkan konfigurasi environment
cp .env.example .env
#   lalu sesuaikan DB_USER / DB_PASSWORD / DB_HOST dengan server MySQL Anda

# 3. Jalankan server database (hanya sekali / setiap start ulang)
npm run db:init

# 4. Jalankan aplikasi
npm start          # http://localhost:3000
#   atau mode dev: npm run dev
```

`npm run db:init` membaca [server/schema.sql](server/schema.sql) dan
[server/schema-cms.sql](server/schema-cms.sql) — aman dijalankan berulang kali
(`CREATE TABLE IF NOT EXISTS` + `ON DUPLICATE KEY UPDATE`).

**Kredensial CMS default**: username `admin`, password `admin123` — **ganti setelah login pertama**.

### Troubleshooting login CMS

| Gejala | Penyebab & solusi |
|--------|-------------------|
| Tombol "Masuk" tidak merespons, atau panel login tetap tampil setelah berhasil login | Hard refresh (`Ctrl+Shift+R`) agar CSS terbaru ter-cache. Overlay login memakai properti `hidden`; stylesheet sudah memaksa `[hidden] { display: none !important; }` |
| "Username atau password salah" | Kredensial default: `admin` / `admin123`. Password di-hash dengan scrypt + salt `itv-salt-2026`, jadi tidak bisa dibaca dari database |
| Halaman login masih terlihat setelah login, dashboard di bawahnya | Buka DevTools → Console, cek error JS. Jalankan ulang server: `npm start` |
| API `/api/admin/login` 401 | Sesi di `cms_sessions` kedaluwarsa (12 jam) atau tabel sesi kosong. Hapus baris di `cms_sessions` lalu login ulang |

---

## 3. Konfigurasi `.env`

| Variabel         | Nilai default    | Keterangan                              |
|------------------|------------------|-----------------------------------------|
| `PORT`           | `3000`           | Port HTTP aplikasi                      |
| `HOST`           | `0.0.0.0`        | Bind address server                     |
| `DB_HOST`        | `127.0.0.1`      | Host MySQL                              |
| `DB_PORT`        | `3306`           | Port MySQL                              |
| `DB_NAME`        | `itv_corporate`  | Nama database                           |
| `DB_USER`        | `itv_user`       | User database                           |
| `DB_PASSWORD`    | `ItvDev2026!`    | Password database                       |
| `DB_POOL`        | `10`             | Ukuran connection pool                  |

> `.env` sudah masuk `.gitignore` — **jangan** commit password ke repository.

---

## 4. Struktur database

Database `itv_corporate` (charset `utf8mb4` / `utf8mb4_unicode_ci`, engine InnoDB).

### Konten & prospek
| Tabel      | Isi                                                    |
|------------|--------------------------------------------------------|
| `services` | 4 pilar solusi (icon, deskripsi, fitur JSON)          |
| `products` | 6 produk enterprise (deskripsi, fitur JSON, sektor)   |
| `sectors`  | 7 sektor penempatan layanan (deskripsi, tags)         |
| `clients`  | 10 klien per industri (nama, segmen, monogram, logo)   |
| `partners` | 8 mitra/ekosistem teknologi (kategori, deskripsi, logo) |
| `banners`  | Slide hero carousel (judul, CTA, chips, badges, urutan, `image_url`, `image_alt`, `show_caption`) |
| `leads`    | Permintaan konsultasi dari form situs (status `new`)  |

### CMS
| Tabel              | Isi                                                        |
|--------------------|------------------------------------------------------------|
| `cms_users`        | Akun admin CMS (password di-hash `scrypt`)                 |
| `cms_sessions`     | Token sesi login (kedaluwarsa 12 jam)                      |
| `articles`         | Artikel: slug, konten, tag, status, views                  |
| `site_settings`    | Konfigurasi `brand.*` (group `branding`) dan `seo.*`       |
| `page_views`       | Log kunjungan: path, durasi, visitor, perangkat            |
| `analytics_events` | Log event klik (CTA, tombol, form)                         |
| `keywords`         | Target kata kunci + metrik Difficult/Search Volume        |
| `keyword_rankings` | Riwayat peringkat per kata kunci                           |
| `article_keywords` | Relasi artikel ↔ kata kunci                                |

Kolom `features`, `tags`, dan `meta` bertipe `JSON` dan dibaca API lewat `JSON.parse`
(MariaDB dapat mengembalikan JSON sebagai string).

---

## 5. Endpoint API

### Publik
| Method | Endpoint                | Keterangan                                          |
|--------|-------------------------|-----------------------------------------------------|
| GET    | `/api/health`           | Status server + versi/database (503 bila gagal)    |
| GET    | `/api/services`         | Daftar layanan aktif                                |
| GET    | `/api/products`         | Daftar produk aktif                                 |
| GET    | `/api/sectors`          | Daftar sektor aktif                                 |
| GET    | `/api/clients`          | Daftar klien aktif + mitra/ekosistem teknologi      |
| GET    | `/api/banners`          | Slide banner aktif untuk hero carousel             |
| GET    | `/api/stats`            | Jumlah layanan/produk/sektor/leads                 |
| GET    | `/api/site-config`      | Branding + SEO aktif untuk website publik          |
| GET    | `/api/articles`         | Artikel terbit (`?limit=`)                          |
| GET    | `/api/articles/:slug`   | Detail artikel (menambah `views`)                   |
| POST   | `/api/leads`            | Simpan permintaan konsultasi (validasi 422)         |
| GET    | `/api/leads`            | 100 lead terakhir                                   |
| POST   | `/api/track`            | Pageview / beacon durasi kunjungan                  |
| POST   | `/api/track/event`      | Event klik (body: `event`, `label`, `path`)         |
| GET    | `/robots.txt`           | Dari pengaturan `seo.robots_txt`                    |
| GET    | `/sitemap.xml`          | Dari pengaturan `seo.canonical_base` + artikel      |

### CMS (butuh `Authorization: Bearer <token>`)
| Method | Endpoint                       | Keterangan                                 |
|--------|-------------------------------|--------------------------------------------|
| POST   | `/api/admin/login`             | Login → token sesi                         |
| POST   | `/api/admin/logout`            | Hapus sesi                                |
| GET    | `/api/admin/me`                | Info pengguna login                        |
| GET    | `/api/admin/dashboard`         | Ringkasan KPI                             |
| GET    | `/api/admin/analytics/pages`   | Pageview per halaman                       |
| GET    | `/api/admin/analytics/timeseries` | Deret waktu pageview                   |
| GET/POST/PUT/DELETE | `/api/admin/articles[...]` | CRUD artikel                        |
| GET    | `/api/admin/settings`          | Semua pengaturan (`?group=branding\|seo`)   |
| PUT    | `/api/admin/settings`          | Simpan pengaturan                          |
| GET    | `/api/admin/seo/audit`         | Skor + pemeriksaan SEO                     |
| GET/POST/PUT/DELETE | `/api/admin/keywords[...]` | CRUD kata kunci                      |
| POST   | `/api/admin/keywords/:id/rank` | Catat peringkat baru                      |
| GET    | `/api/admin/clients`           | Daftar klien + pilihan segmen        |
| POST   | `/api/admin/clients`           | Tambah klien                          |
| PUT    | `/api/admin/clients/:id`       | Ubah klien                            |
| DELETE | `/api/admin/clients/:id`       | Hapus klien                          |
| GET    | `/api/admin/partners`          | Daftar mitra + pilihan kategori      |
| POST   | `/api/admin/partners`          | Tambah mitra                          |
| PUT    | `/api/admin/partners/:id`      | Ubah mitra                            |
| DELETE | `/api/admin/partners/:id`      | Hapus mitra                          |
| GET    | `/api/admin/banners`           | Daftar slide banner + status aktif         |
| POST   | `/api/admin/banners`           | Tambah slide banner                        |
| PUT    | `/api/admin/banners/:id`       | Ubah slide banner                          |
| DELETE | `/api/admin/banners/:id`       | Hapus slide banner                         |
| POST   | `/api/admin/banners/upload`    | Unggah gambar banner (base64 data URL)    |
| POST   | `/api/admin/media/upload`      | Unggah logo klien/mitra (folder clients/partners) |
| GET    | `/api/admin/leads`             | Daftar prospek                             |
| PUT    | `/api/admin/leads/:id`         | Ubah status prospek                        |

Contoh simpan lead:

```bash
curl -X POST http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Budi","company":"PT Contoh","email":"budi@contoh.id","phone":"08123456789","sector":"Retail","service":"Smart Display & Digital Signage","message":"Mohon info paket."}'
```

Contoh login CMS:

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 6. Integrasi website publik ↔ CMS

Situs publik membaca konfigurasi dari CMS secara otomatis setiap kali halaman dimuat:

| Sumber            | Key pengaturan                                              | Dampak di website                          |
|-------------------|-------------------------------------------------------------|--------------------------------------------|
| Branding          | `brand.company_name`, `brand.logo_text`, `brand.tagline`, `brand.primary_color`, `brand.secondary_color`, `brand.dark_color`, `brand.email`, `brand.phone`, `brand.website`, `brand.address` | Teks `[data-brand]` + CSS variable (`--blue`, `--cyan`, `--navy`) |
| SEO               | `seo.site_title`, `seo.meta_description`, `seo.meta_keywords`, `seo.canonical_base`, `seo.og_image`, `seo.og_type`, `seo.twitter_card`, `seo.twitter_site`, `seo.robots`, `seo.title_template`, `seo.google_site_verification`, `seo.schema_org` | `<title>`, meta tag, Open Graph, Twitter Card, canonical, JSON-LD |
| SEO file          | `seo.robots_txt`, `seo.sitemap_enabled`                       | `/robots.txt` & `/sitemap.xml`              |
| Konten            | Tabel `articles` (status `published`)                        | Grid "Insight" + halaman artikel           |
| Pelacakan         | Tabel `page_views`, `analytics_events`                       | Dashboard & halaman Analitik di CMS         |

### Nilai bawaan SEO (hasil seed `server/schema-cms.sql`)

| Key | Nilai bawaan | Panjang |
|-----|--------------|---------|
| `seo.site_title` | `PT. Integration Teknologi Visual — Solusi Digital Enterprise` | 60 karakter |
| `seo.meta_description` | `PT. Integration Teknologi Visual menyediakan software enterprise, digital signage, integrasi sistem, dan AI automation untuk korporasi di Indonesia.` | 148 karakter |
| `seo.canonical_base` | `https://www.integrasiteknologivisual.com` | — |
| `seo.og_image` | `/img/og-default.svg` | 1200×630 |
| `seo.title_template` | `%s \| PT. Integration Teknologi Visual` | — |

Skor audit SEO bawaan: **86/100** (satu item belum terisi: `seo.google_site_verification` —
isi dengan kode verifikasi Google Search Console Anda).

---

## 7. Menjalankan di Codespaces / hosting

Server Express berjalan di `0.0.0.0:${PORT}` sehingga bisa di-*forward* sebagai port publik:

```bash
gh codespace ports visibility 3000:public -c <nama-codespace>
```

Untuk produksi, arahkan variabel `DB_*` ke MySQL terkelola (PlanetScale, AWS RDS, Azure Database
for MySQL, atau TiDB) — tidak ada perubahan kode yang diperlukan, hanya isi `.env`.

Alternatif statis: deploy isi folder `public/` ke GitHub Pages (catatan: mode statis tidak
menjalankan API, sehingga form perlu diarahkan ke form service pihak ketiga).

---

## 8. Struktur proyek

```
├── package.json
├── .env / .env.example
├── server/
│   ├── index.js         # Express app + route /api/* + robots/sitemap
│   ├── db.js            # mysql2 connection pool
│   ├── auth.js          # hash password, sesi, middleware requireAuth
│   ├── cms-api.js       # router API CMS (/api/admin/*, /api/cms/*)
│   ├── init-db.js       # runner schema.sql + schema-cms.sql
│   ├── schema.sql       # DDL + seed konten & lead
│   └── schema-cms.sql   # DDL + seed CMS (user, pengaturan, kata kunci)
└── public/
    ├── index.html       # landing page (SEO + branding hooks)
    ├── artikel.html     # halaman detail artikel
    ├── styles.css
    ├── script.js        # render dari API + SEO/branding + pelacakan
    ├── favicon.svg      # favicon 64×64 (ITV)
    ├── img/
    │   ├── og-default.svg  # gambar Open Graph default 1200×630
    │   ├── clients/       # 10 placeholder logo klien (SVG 320×200)
    │   └── partners/      # 8 placeholder logo mitra (SVG 320×200)
    ├── uploads/           # hasil unggahan CMS (banner, clients, partners)
    ├── vendor/
    │   └── bootstrap-icons/ # Bootstrap Icons 1.11.3 (lokal, tanpa CDN)
    │       ├── bootstrap-icons.min.css
    │       └── fonts/
    │           ├── bootstrap-icons.woff2
    │           └── bootstrap-icons.woff
    └── admin/
        ├── index.html   # shell portal CMS
        ├── admin.css
        └── admin.js     # login, dashboard, artikel, SEO, branding, keyword, analitik, lead
```

### Ikon: Bootstrap Icons

Semua ikon situs memakai **Bootstrap Icons 1.11.3** yang di-*vendor* secara lokal di
`public/vendor/bootstrap-icons/` (tidak bergantung pada CDN eksternal). Setiap halaman
memuat CSS-nya sebelum stylesheet utama:

```html
<link rel="stylesheet" href="/vendor/bootstrap-icons/bootstrap-icons.min.css" />
```

Penggunaan di HTML:

```html
<i class="bi bi-telephone"></i>
```

Untuk ikon yang berasal dari database (mis. kolom `services.icon`), nilainya disimpan
sebagai nama ikon singkat tanpa prefiks (contoh: `gear`, `display`, `code-square`,
`diagram-3`, `cloud`) karena kolom bertipe `VARCHAR(16)`, lalu dirender oleh helper
`biIcon()` di `public/script.js`:

```js
function biIcon(name) {
  const safe = String(name || 'gear').replace(/[^a-z0-9-]/gi, '') || 'gear';
  return el('i', `bi bi-${safe}`);
}
```

> Catatan: `el()` menetapkan `textContent`, sehingga elemen ikon harus dibuat lewat
> `document.createElement('i')` / `innerHTML`.

---

## 9. Kontak

- Website: https://www.integrasiteknologivisual.com
- WhatsApp: 085117183332
- Email: business@integrasiteknologivisual.com
