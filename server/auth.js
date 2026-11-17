import crypto from 'node:crypto';
import { query } from './db.js';

const SESSION_HOURS = Number(process.env.SESSION_HOURS || 12);
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

export function verifyPassword(password, salt, expectedHash) {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(String(expectedHash), 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function randomToken(bytes = 40) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** ID pengunjung anonim (hash IP + user agent), tanpa menyimpan data pribadi. */
export function visitorFingerprint(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim();
  const ua = req.headers['user-agent'] || 'unknown';
  return crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
}

/**
 * Login CMS: verifikasi kredensial, buat session token.
 * Mengembalikan { ok, token, user } atau { ok:false, error }.
 */
export async function login(username, password, req) {
  const uname = String(username || '').trim();
  if (!uname || !password) {
    return { ok: false, error: 'Username dan password wajib diisi' };
  }

  const rows = await query('SELECT * FROM cms_users WHERE username = ? LIMIT 1', [uname]);
  const user = rows[0];
  if (!user || !user.is_active) {
    return { ok: false, error: 'Username atau password salah' };
  }
  if (!verifyPassword(password, user.salt, user.password_hash)) {
    return { ok: false, error: 'Username atau password salah' };
  }

  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  await query(
    'INSERT INTO cms_sessions (token, user_id, user_agent, expires_at) VALUES (?, ?, ?, ?)',
    [token, user.id, String(req.headers['user-agent'] || '').slice(0, 255), expires]
  );
  await query('UPDATE cms_users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  return {
    ok: true,
    token,
    expires_at: expires,
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
  };
}

export async function logout(token) {
  if (!token) return;
  await query('DELETE FROM cms_sessions WHERE token = ?', [token]);
}

/** Validasi token session dan kembalikan data user. */
export async function resolveSession(token) {
  if (!token) return null;
  const rows = await query(
    `SELECT s.token, s.expires_at, u.id, u.username, u.full_name, u.role
     FROM cms_sessions s JOIN cms_users u ON u.id = s.user_id
     WHERE s.token = ? LIMIT 1`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query('DELETE FROM cms_sessions WHERE token = ?', [token]);
    return null;
  }
  return { id: row.id, username: row.username, full_name: row.full_name, role: row.role, token: row.token };
}

/** Middleware Express: mewajibkan session CMS yang valid. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : req.query.token;
  resolveSession(token)
    .then((session) => {
      if (!session) return res.status(401).json({ ok: false, error: 'Sesi tidak valid atau telah berakhir' });
      req.session = session;
      next();
    })
    .catch(next);
}

/** Bersihkan session kedaluwarsa (dipanggil berkala). */
export async function purgeExpiredSessions() {
  await query('DELETE FROM cms_sessions WHERE expires_at < NOW()');
}

export const AUTH_LIMITS = { MAX_FAILED, LOCK_MINUTES };
