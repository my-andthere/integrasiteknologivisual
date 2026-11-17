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
- **Konten dinamis dari MySQL**: kartu layanan, produk, sektor, dan artikel dirender dari
  database (dengan fallback markup statis bila API tidak terjangkau).
- **SEO & branding otomatis dari CMS**: `<title>`, meta description/keywords, Open Graph,
  Twitter Card, canonical, JSON-LD Schema.org, `robots.txt`, dan `sitemap.xml` diambil dari
  pengaturan `seo.*` di CMS; warna & identitas perusahaan dari `brand.*`.
- **Artikel**: grid artikel di landing page + halaman detail [public/artikel.html](public/artikel.html).
- **Analitik ringan**: pageview, durasi kunjungan, dan event klik CTA terkirim ke API.
- **Lead capture**: form Permintaan Konsultasi → `POST /api/leads` → tabel `leads`.

### Portal CMS (`/admin`)
- **Login** dengan session token (Bearer) + tabel `cms_sessions`.
- **Dashboard**: KPI pageview 30 hari, pengunjung unik, rata-rata durasi, lead, artikel, kata kunci.
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
    └── admin/
        ├── index.html   # shell portal CMS
        ├── admin.css
        └── admin.js     # login, dashboard, artikel, SEO, branding, keyword, analitik, lead
```

---

## 9. Kontak

- Website: https://www.integrasiteknologivisual.com
- WhatsApp: 085117183332
- Email: business@integrasiteknologivisual.com
