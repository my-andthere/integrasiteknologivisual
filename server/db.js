import mysql from 'mysql2/promise';
import 'dotenv/config';

/**
 * Pool koneksi MySQL/MariaDB.
 * Konfigurasi diambil dari environment variable (.env) sehingga yang sama
 * bisa diarahkan ke database lokal (dev) maupun database terkelola (production).
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'itv_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'itv_corporate',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL || 10),
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: true
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Sanitasi nilai JSON dari kolom JSON MySQL (MariaDB mengembalikan string). */
export function parseJson(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function checkConnection() {
  const rows = await query('SELECT VERSION() AS version, DATABASE() AS db');
  return rows[0];
}

/**
 * Normalisasi baris tabel `banners`:
 *  - chips   : "A, B, C"  -> ["A", "B", "C"]
 *  - badges  : JSON string -> [{ v: "6 Bulan", l: "Garansi Software" }]
 */
export function mapBanner(row) {
  if (!row) return null;
  return {
    ...row,
    chips: String(row.chips || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
    badges: parseJson(row.badges, [])
  };
}
