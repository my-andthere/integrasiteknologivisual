-- =========================================================
-- PT. Integration Teknologi Visual — CMS Schema (Portal Admin)
-- Dipanggil oleh init-db.js setelah schema.sql
-- =========================================================

-- Admin / editor portal — login CMS
CREATE TABLE IF NOT EXISTS cms_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  salt          VARCHAR(80)  NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'editor',
  last_login_at DATETIME     NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_sessions (
  token      VARCHAR(80)  NOT NULL PRIMARY KEY,
  user_id    INT          NOT NULL,
  user_agent VARCHAR(255) NULL,
  expires_at DATETIME     NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES cms_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Artikel / konten blog
CREATE TABLE IF NOT EXISTS articles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(180) NOT NULL UNIQUE,
  title         VARCHAR(220) NOT NULL,
  excerpt       TEXT         NULL,
  content       LONGTEXT     NOT NULL,
  cover_image   VARCHAR(400) NULL,
  category      VARCHAR(80)  NULL,
  tags          JSON         NULL,
  author        VARCHAR(120) NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'draft',
  views         INT          NOT NULL DEFAULT 0,
  seo_title     VARCHAR(220) NULL,
  seo_description VARCHAR(320) NULL,
  focus_keyword VARCHAR(160) NULL,
  published_at  DATETIME     NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_articles_status (status, published_at),
  KEY idx_articles_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pengaturan global: branding + SEO (key-value)
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key  VARCHAR(80)  NOT NULL PRIMARY KEY,
  setting_value TEXT        NULL,
  setting_group VARCHAR(40) NOT NULL DEFAULT 'general',
  label        VARCHAR(160) NULL,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analitik pengunjung
CREATE TABLE IF NOT EXISTS page_views (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  path       VARCHAR(255) NOT NULL,
  referrer   VARCHAR(400) NULL,
  referrer_host VARCHAR(160) NULL,
  visitor_id VARCHAR(64)  NOT NULL,
  session_id VARCHAR(64)  NULL,
  device     VARCHAR(20)  NOT NULL DEFAULT 'desktop',
  browser    VARCHAR(40)  NULL,
  os         VARCHAR(40)  NULL,
  country    VARCHAR(60)  NULL,
  duration   INT          NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pv_created (created_at),
  KEY idx_pv_path (path),
  KEY idx_pv_visitor (visitor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- events konversi (klik tombol, submit form, scroll depth)
CREATE TABLE IF NOT EXISTS analytics_events (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_name VARCHAR(80)  NOT NULL,
  path       VARCHAR(255) NULL,
  label      VARCHAR(160) NULL,
  visitor_id VARCHAR(64)  NULL,
  meta       JSON         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ev_name (event_name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Target kata kunci SEO
CREATE TABLE IF NOT EXISTS keywords (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  keyword       VARCHAR(180) NOT NULL UNIQUE,
  search_volume INT          NOT NULL DEFAULT 0,
  difficulty    INT          NOT NULL DEFAULT 0,
  current_rank  INT          NULL,
  target_url    VARCHAR(255) NULL,
  intent        VARCHAR(30)  NOT NULL DEFAULT 'informational',
  status        VARCHAR(30)  NOT NULL DEFAULT 'tracked',
  notes         TEXT         NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Riwayat posisi kata kunci
CREATE TABLE IF NOT EXISTS keyword_rankings (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  keyword_id INT         NOT NULL,
  position   INT         NOT NULL,
  checked_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kr_keyword (keyword_id, checked_at),
  CONSTRAINT fk_kr_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relasi artikel <-> kata kunci
CREATE TABLE IF NOT EXISTS article_keywords (
  article_id INT NOT NULL,
  keyword_id INT NOT NULL,
  PRIMARY KEY (article_id, keyword_id),
  CONSTRAINT fk_ak_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_ak_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Seed: user admin default + pengaturan awal
-- =========================================================
INSERT INTO cms_users (username, password_hash, salt, full_name, role)
VALUES (
  'admin',
  '2c6300c682659c4535ead1f54b58f94e1ecc27f48eba45090a84bd38f159d866f8d798c92e3dbdc3ddd569727491a31d4bf34cae7592aba5d3d35dc48d9ffb73',
  'itv-salt-2026',
  'Administrator ITV',
  'admin'
)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role);

INSERT INTO site_settings (setting_key, setting_value, setting_group, label) VALUES
('brand.company_name',      'PT. Integration Teknologi Visual', 'branding', 'Nama perusahaan'),
('brand.logo_text',         'ITV',                            'branding', 'Teks logo'),
('brand.tagline',           'Enterprise Digital Solution Partner', 'branding', 'Tagline'),
('brand.primary_color',     '#1f6feb',                        'branding', 'Warna utama'),
('brand.secondary_color',   '#00b8d9',                        'branding', 'Warna aksen'),
('brand.dark_color',        '#0b1f3a',                        'branding', 'Warna gelap'),
('brand.email',             'business@integrasiteknologivisual.com', 'branding', 'Email'),
('brand.phone',             '085117183332',                   'branding', 'Telepon / WhatsApp'),
('brand.website',           'https://www.integrasiteknologivisual.com', 'branding', 'Website'),
('brand.address',           'Jakarta, Indonesia',              'branding', 'Alamat'),
('seo.site_title',          'PT. Integration Teknologi Visual — Solusi Digital Enterprise', 'seo', 'Judul situs'),
('seo.title_template',      '%s | PT. Integration Teknologi Visual', 'seo', 'Template judul'),
('seo.meta_description',    'PT. Integration Teknologi Visual menyediakan software enterprise, digital signage, integrasi sistem, dan AI automation untuk korporasi di Indonesia.', 'seo', 'Meta description'),
('seo.meta_keywords',       'software enterprise Indonesia, digital signage, interactive display, system integration, AI chatbot, managed IT', 'seo', 'Meta keywords'),
('seo.og_image',            '/img/og-default.svg',            'seo', 'Gambar Open Graph'),
('seo.og_type',             'website',                        'seo', 'Tipe Open Graph'),
('seo.twitter_site',        '@integrasiteknologivisual',      'seo', 'Akun Twitter'),
('seo.canonical_base',      'https://www.integrasiteknologivisual.com', 'seo', 'URL canonical'),
('seo.robots',              'index, follow',                  'seo', 'Direktif robots'),
('seo.google_site_verification', '',                           'seo', 'Google Site Verification'),
('seo.twitter_card',        'summary_large_image',            'seo', 'Twitter card'),
('seo.sitemap_enabled',     '1',                              'seo', 'Sitemap aktif'),
('seo.robots_txt',          'User-agent: *\nAllow: /\nSitemap: https://www.integrasiteknologivisual.com/sitemap.xml', 'seo', 'Isi robots.txt'),
('seo.schema_org',          '{"@context":"https://schema.org","@type":"Organization","name":"PT. Integration Teknologi Visual","url":"https://www.integrasiteknologivisual.com","telephone":"+6285117183332","email":"business@integrasiteknologivisual.com"}', 'seo', 'JSON-LD Organization')
ON DUPLICATE KEY UPDATE setting_group = VALUES(setting_group), label = VALUES(label);

INSERT INTO keywords (keyword, search_volume, difficulty, current_rank, target_url, intent, status) VALUES
('software enterprise indonesia', 2900, 62, 8,  'https://www.integrasiteknologivisual.com', 'commercial', 'improving'),
('digital signage jakarta',       1900, 55, 12, 'https://www.integrasiteknologivisual.com', 'commercial', 'tracked'),
('sistem integrasi ERP CRM',     1600, 58, 14, 'https://www.integrasiteknologivisual.com', 'informational', 'tracked'),
('managed it services indonesia', 1300, 51, 21, 'https://www.integrasiteknologivisual.com', 'commercial', 'tracked'),
('kiosk interaktif mall',          880, 44, 17, 'https://www.integrasiteknologivisual.com', 'informational', 'tracked'),
('ai chatbot customer service',   2400, 66, 9,  'https://www.integrasiteknologivisual.com', 'commercial', 'improving')
ON DUPLICATE KEY UPDATE search_volume = VALUES(search_volume), difficulty = VALUES(difficulty);
