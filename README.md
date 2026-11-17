# PT. Integration Teknologi Visual — Website Korporat + MySQL

Website landing page perusahaan **PT. Integration Teknologi Visual** (mitra transformasi digital:
software enterprise, digital signage, interactive display, dan integrasi sistem), dilengkapi
**REST API berbasis Node/Express** dan **database MySQL (MariaDB)**.

---

## 1. Fitur

- **Halaman korporat statis** (HTML5/CSS3/vanilla JS, tanpa build step): hero, layanan, produk,
  sektor, form konsultasi, footer.
- **REST API** (`/api/*`) dengan koneksi database memakai **connection pool** (`mysql2`).
- **Konten dinamis dari MySQL**: kartu layanan, produk, dan sektor di-render dari database
  (dengan fallback ke markup statis bila API tidak terjangkau).
- **Lead capture**: form Permintaan Konsultasi → `POST /api/leads` → tersimpan di tabel `leads`.
- **Status koneksi DB** ditampilkan sebagai badge di halaman ("Database terhubung — itv_corporate").

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

`npm run db:init` membaca [server/schema.sql](server/schema.sql) — aman dijalankan berulang kali
(`CREATE TABLE IF NOT EXISTS` + `ON DUPLICATE KEY UPDATE`).

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

| Tabel      | Isi                                                    |
|------------|--------------------------------------------------------|
| `services` | 4 pilar solusi (icon, deskripsi, fitur JSON)          |
| `products` | 6 produk enterprise (deskripsi, fitur JSON, sektor)   |
| `sectors`  | 7 sektor penempatan layanan (deskripsi, tags)         |
| `leads`    | Permintaan konsultasi dari form situs (status `new`)  |

Kolom `features` bertipe `JSON` dan dibaca API lewat `JSON.parse` (MariaDB dapat mengembalikan
JSON sebagai string).

---

## 5. Endpoint API

| Method | Endpoint        | Keterangan                                       |
|--------|-----------------|--------------------------------------------------|
| GET    | `/api/health`   | Status server + versi/database (503 bila gagal) |
| GET    | `/api/services` | Daftar layanan aktif                             |
| GET    | `/api/products` | Daftar produk aktif                              |
| GET    | `/api/sectors`  | Daftar sektor aktif                              |
| GET    | `/api/stats`    | Jumlah layanan/produk/sektor/leads              |
| POST   | `/api/leads`    | Simpan permintaan konsultasi (validasi 422)      |
| GET    | `/api/leads`    | 100 lead terakhir                                |

Contoh simpan lead:

```bash
curl -X POST http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Budi","company":"PT Contoh","email":"budi@contoh.id","phone":"08123456789","sector":"Retail","service":"Smart Display & Digital Signage","message":"Mohon info paket."}'
```

---

## 6. Menjalankan di Codespaces / hosting

Server Express berjalan di `0.0.0.0:${PORT}` sehingga bisa di-*forward* sebagai port publik:

```bash
gh codespace ports visibility 3000:public -c <nama-codespace>
```

Untuk produksi, arahkan variabel `DB_*` ke MySQL terkelola (PlanetScale, AWS RDS, Azure Database
for MySQL, atau TiDB) — tidak ada perubahan kode yang diperlukan, hanya isi `.env`.

Alternatif statis: deploy isi folder `public/` ke GitHub Pages (catatan: mode statis tidak
menjalankan API, sehingga form perlu diarahkan ke form service pihak ketiga).

---

## 7. Struktur proyek

```
├── package.json
├── .env / .env.example
├── server/
│   ├── index.js       # Express app + route /api/*
│   ├── db.js          # mysql2 connection pool
│   ├── init-db.js     # runner schema.sql
│   └── schema.sql     # DDL + seed data
└── public/
    ├── index.html
    ├── styles.css
    └── script.js      # render dari API + submit form
```

---

## 8. Kontak

- Website: https://www.integrasiteknologivisual.com
- WhatsApp: 085117183332
- Email: business@integrasiteknologivisual.com
