-- =========================================================
-- PT. Integration Teknologi Visual — MySQL Schema
-- =========================================================

CREATE TABLE IF NOT EXISTS services (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(80)  NOT NULL UNIQUE,
  title         VARCHAR(160) NOT NULL,
  icon          VARCHAR(16)  NOT NULL DEFAULT 'gear',
  short_desc    TEXT         NOT NULL,
  features      JSON         NULL,
  sort_order    INT          NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_leads_status (status, created_at),
  KEY idx_leads_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(80)  NOT NULL UNIQUE,
  title         VARCHAR(160) NOT NULL,
  description   TEXT         NOT NULL,
  features      JSON         NULL,
  sector        VARCHAR(80)  NULL,
  sort_order    INT          NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sectors (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(80)  NOT NULL UNIQUE,
  title         VARCHAR(120) NOT NULL,
  description   TEXT         NOT NULL,
  tags          VARCHAR(160) NULL,
  sort_order    INT          NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(80)  NOT NULL UNIQUE,
  name          VARCHAR(160) NOT NULL,
  segment       VARCHAR(80)  NOT NULL,
  initials      VARCHAR(8)   NOT NULL DEFAULT 'ITV',
  sort_order    INT          NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partners (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(80)  NOT NULL UNIQUE,
  name          VARCHAR(160) NOT NULL,
  category      VARCHAR(80)  NOT NULL,
  description   VARCHAR(255) NULL,
  initials      VARCHAR(8)   NOT NULL DEFAULT 'PR',
  sort_order    INT          NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE partners ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS leads (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  company       VARCHAR(160) NULL,
  email         VARCHAR(160) NOT NULL,
  phone         VARCHAR(40)  NOT NULL,
  sector        VARCHAR(80)  NULL,
  service       VARCHAR(80)  NULL,
  message       TEXT         NULL,
  source        VARCHAR(60)  NOT NULL DEFAULT 'website',
  status        VARCHAR(20)  NOT NULL DEFAULT 'new',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Seed data
-- =========================================================
INSERT INTO services (slug, title, icon, short_desc, features, sort_order) VALUES
('smart-display',      'Smart Display & Digital Signage', 'display',
 'Jaringan display terpusat untuk komunikasi internal, promosi, dan informasi operasional real-time.',
 JSON_ARRAY('Digital Signage Standing & Wall-Mount','Interactive Kiosk','Interactive Whiteboard','Videotron Indoor / Outdoor','Video Wall & Centralized CMS'), 1),
('software-enterprise','Software Enterprise Kustom', 'code-square',
 'Aplikasi yang dibangun khusus mengikuti alur kerja, bukan template generik.',
 JSON_ARRAY('Web Application & API Service','Mobile Android & iOS','ERP, CRM & HRIS','Business Intelligence & Dashboard','Modul real-time & notifikasi'), 2),
('integration-ai',     'System Integration & AI Automation', 'diagram-3',
 'Menyatukan sistem yang tersebar menjadi satu alur data yang konsisten.',
 JSON_ARRAY('REST API & Middleware Integration','IoT & Device Connectivity','Payment Gateway Integration','AI Chatbot & Automation','Legacy System Migration'), 3),
('cloud-managed-it',   'Cloud Server & Managed IT', 'cloud',
 'Infrastruktur terkelola tim kami, Anda fokus pada operasi bisnis inti.',
 JSON_ARRAY('Cloud Server & Virtualization','Backup & Disaster Recovery','Monitoring 24/7 & Incident Response','Domain, SSL & Email Enterprise','Managed Maintenance'), 4)
ON DUPLICATE KEY UPDATE title = VALUES(title), icon = VALUES(icon), short_desc = VALUES(short_desc), features = VALUES(features), sort_order = VALUES(sort_order), is_active = 1;

INSERT INTO products (slug, title, description, features, sector, sort_order) VALUES
('enterprise-platform','Enterprise Integrated Platform',
 'Pusat kendali terpadu yang menyatukan modul operasional, analitik, dan monitoring dalam satu tampilan.',
 JSON_ARRAY('Single Sign-On & Role Based Access','Master Data Terpusat','Reporting Real-Time','Integrasi Multi-Sistem'),'Corporate',1),
('smart-retail','Smart Retail & Mall Experience',
 'Digital signage dan kiosk interaktif untuk guided shopping, queue management, dan promosi dinamis.',
 JSON_ARRAY('Queue & Counter Management','Digital Directory Interaktif','Promo & Content Scheduling','Customer Analytics'),'Retail',2),
('factory-monitoring','Factory & Manufacturing Monitoring',
 'Integrasi MES, sensor IoT, dan dashboard produksi untuk visibilitas line secara real-time.',
 JSON_ARRAY('OEE & Downtime Monitoring','IoT Sensor Integration','Traceability & Quality Record','Plant Dashboard'),'Manufacturing',3),
('gov-digital','Government Digital Service',
 'Portal layanan publik, sistem informasi terpadu, dan display informasi dengan service desk terpusat.',
 JSON_ARRAY('Portal & e-Service','Sistem Informasi Terpadu','Command Center & Video Wall','Data & Dokumen Digital'),'Government',4),
('ai-automation','AI Automation & Chatbot',
 'Otomatisasi layanan pelanggan dan proses internal berulang dengan AI yang terhubung ke data bisnis.',
 JSON_ARRAY('Customer Service Chatbot','Document Processing','Knowledge Base Integration','Human-in-the-loop Workflow'),'Corporate',5),
('business-intelligence','Business Intelligence & Dashboard',
 'Data bisnis disparate diubah menjadi insight yang dapat ditindaklanjuti oleh manajemen.',
 JSON_ARRAY('Data Warehouse & ETL','Executive Dashboard','KPI & Alerting','Multi-tenant Reporting'),'Corporate',6)
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), features = VALUES(features), sort_order = VALUES(sort_order);

INSERT INTO sectors (slug, title, description, tags, sort_order) VALUES
('corporate','Corporate & Enterprise','Digitalisasi proses inti, integrasi multi-sistem, dan enterprise platform untuk organisasi berskala besar.','ERP • CRM • HRIS • BI',1),
('mall-retail','Mall & Retail','Digital signage, interactive kiosk, dan analitik pelanggan untuk pengalaman belanja yang lebih baik.','CMS • Kiosk • Analytics',2),
('manufacturing','Industry & Manufacturing','Monitoring produksi, integrasi IoT, dan sistem operasi berbasis data real-time.','IoT • OEE • Traceability',3),
('government','Government','Digitalisasi layanan publik, sistem informasi terpadu, dan command center untuk instansi pemerintah.','e-Service • Command Center',4),
('banking','Perbankan & Keuangan','Integrasi payment gateway, core system, dan layanan digital dengan standar keamanan tinggi.','Payment Gateway • Core Integration',5),
('healthcare','Healthcare','Sistem informasi kesehatan, integrasi laboratorium, dan display informasi layanan.','SIMRS • Interop • Display',6),
('education','Hotel, Properti & Pendidikan','Digital signage di area publik, integrasi sistem reservasi, dan portal layanan internal.','Signage • Booking • Portal',7)
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), tags = VALUES(tags), sort_order = VALUES(sort_order);

INSERT INTO clients (slug, name, segment, initials, sort_order) VALUES
('retail-nasional',      'Jaringan Retail Nasional',    'Retail',            'RN', 1),
('grup-manufaktur',      'Grup Manufaktur',            'Manufacturing',     'GM', 2),
('bank-keuangan',        'Bank & Institusi Keuangan',   'Financial Services','BK', 3),
('pemerintah-daerah',    'Instansi Pemerintah Daerah',  'Government',        'PD', 4),
('jaringan-rumah-sakit','Jaringan Rumah Sakit',        'Healthcare',        'RS', 5),
('logistik-distribusi',  'Logistik & Distribusi',       'Logistics',         'LD', 6),
('hotel-properti',       'Hotel & Properti',            'Hospitality',       'HP', 7),
('kampus-pendidikan',    'Universitas & Kampus',       'Education',         'UK', 8),
('operator-telkom',      'Operator Telekomunikasi',    'Telecommunications','OT', 9),
('energi-utilitas',      'Perusahaan Energi & Utilitas','Energy',            'EU', 10)
ON DUPLICATE KEY UPDATE name = VALUES(name), segment = VALUES(segment), initials = VALUES(initials), sort_order = VALUES(sort_order), is_active = 1;

INSERT INTO partners (slug, name, category, description, initials, sort_order) VALUES
('oem-display',        'OEM Display & Videotron',        'Hardware',        'Hardware display profesional, video wall, dan perangkat interaktif kelas enterprise.', 'OEM', 1),
('cloud-datacenter',   'Cloud & Data Center',             'Infrastructure',  'Infrastruktur komputasi, storage, dan jaringan dengan standar ketersediaan tinggi.', 'CLD', 2),
('payment-gateway',    'Payment Gateway',                 'Fintech',         'Integrasi pembayaran digital untuk e-commerce, service desk, dan transaksi internal.', 'PG', 3),
('erp-bi-ecosystem',   'ERP & Business Intelligence',     'Software',        'Platform ERP, analitik bisnis, dan modul gestión untuk organisasi skala enterprise.', 'ERP', 4),
('system-integrator',  'System Integrator Mitra',         'Partnership',     'Kolaborasi implementasi lintas domain untuk proyek multi-sistem dan multi-lokasi.', 'SI', 5),
('av-specialist',      'Instalasi & AV Specialist',       'Delivery',        'Pemasangan dan commissioning perangkat AV, display, serta ruang kontrol profesional.', 'AV', 6),
('security-monitoring','Security & Monitoring 24/7',      'Operations',      'Monitoring mainframe, sistem keamanan, dan respons insiden sepanjang hari.', 'SEC', 7),
('support-maintenance','Support & Maintenance Terpadu',   'Service',         'Dukungan operasional, patch management, dan preventive maintenance berkala.', 'SM', 8)
ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category), description = VALUES(description), initials = VALUES(initials), sort_order = VALUES(sort_order), is_active = 1;

-- =========================================================
-- BANNER SLIDESHOW (hero carousel)
-- =========================================================
CREATE TABLE IF NOT EXISTS banners (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  slug            VARCHAR(80)  NOT NULL UNIQUE,
  title           VARCHAR(180) NOT NULL,
  title_highlight VARCHAR(180) NULL,
  eyebrow         VARCHAR(120) NULL,
  description     TEXT         NULL,
  cta_label       VARCHAR(80)  NULL,
  cta_url         VARCHAR(255) NULL,
  cta2_label      VARCHAR(80)  NULL,
  cta2_url        VARCHAR(255) NULL,
  accent          VARCHAR(60)  NULL,
  visual_title    VARCHAR(120) NULL,
  visual_label    VARCHAR(120) NULL,
  visual_caption  VARCHAR(180) NULL,
  chips           VARCHAR(500) NULL,
  badges          TEXT         NULL,
  image_url       VARCHAR(500) NULL,
  image_alt       VARCHAR(180) NULL,
  show_caption    TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order      INT          NOT NULL DEFAULT 0,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrasi: slide gambar saja (aman dijalankan berkali-kali)
ALTER TABLE banners ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS image_alt VARCHAR(180) NULL;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS show_caption TINYINT(1) NOT NULL DEFAULT 0;

INSERT INTO banners
 (slug, title, title_highlight, eyebrow, description, cta_label, cta_url, cta2_label, cta2_url, accent, visual_title, visual_label, visual_caption, chips, badges, sort_order, image_url, image_alt, show_caption)
VALUES
('enterprise-platform', 'Solusi Teknologi Enterprise yang', 'Stabil, Aman & Scalable', 'Mitra Transformasi Digital Enterprise',
 'Kami pendamping korporasi, manufaktur, retail, dan instansi pemerintah dalam membangun <strong>Enterprise Integrated Platform</strong> — mulai dari <strong>Digital Signage & Smart Display</strong>, pengembangan <strong>software kustom</strong>, <strong>System Integration</strong>, <strong>AI Automation</strong>, hingga <strong>Cloud & Managed IT Services</strong>, guna mengoptimalkan operasional bisnis secara <strong>real-time</strong>.',
 'Jadwalkan Konsultasi Gratis', '#kontak', 'Lihat Solusi Kami', '#layanan', NULL,
 'Digital Signage & Smart Display', 'Centralized CMS', 'Multi-lokasi · Update Konten Seketika',
 'Video Wall,Interactive Kiosk,Whiteboard,Videotron Indoor,Videotron Outdoor,IoT Sensor',
 JSON_ARRAY(JSON_OBJECT('v','6 Bulan','l','Garansi Software'),JSON_OBJECT('v','1 Tahun','l','Garansi Hardware'),JSON_OBJECT('v','Real-Time','l','Monitoring & Integrasi'),JSON_OBJECT('v','Modular','l','Skala Bertahap')), 1, '/img/banners/enterprise-platform.svg', 'Solusi Enterprise Platform Terintegrasi', 0),

('software-kustom', 'Aplikasi yang Mengikuti', 'Alur Kerja Anda', 'Software Enterprise Kustom',
 'Kami membangun <strong>web application, mobile app, dan API service</strong> yang mengikuti proses bisnis nyata — bukan template generik. Modul <strong>ERP, CRM, HRIS</strong>, dan <strong>Business Intelligence</strong> diintegrasikan dalam satu fondasi data dengan kontrol akses berbasis peran.',
 'Diskusikan Kebutuhan Anda', '#kontak', 'Lihat Produk', '#produk', 'rgba(31,111,235,.28)',
 'Enterprise Integrated Platform', 'Modul Terintegrasi', 'Single Sign-On · Master Data Terpusat',
 'Web Application,Mobile App,REST API,Single Sign-On,Dashboard BI',
 JSON_ARRAY(JSON_OBJECT('v','Web + Mobile','l','Android & iOS'),JSON_OBJECT('v','Modular','l','ERP · CRM · HRIS'),JSON_OBJECT('v','Terukur','l','Analitik Real-Time')), 2, '/img/banners/software-kustom.svg', 'Aplikasi Software Kustom Sesuai Alur Kerja', 0),

('integration-ai', 'Satu Alur Data', 'yang Konsisten', 'System Integration & AI Automation',
 'Menyatukan sistem yang tersebar — core legacy, payment gateway, sensor IoT, hingga dokumen legacy — lewat <strong>REST API & middleware integration</strong>. Ditambah <strong>AI chatbot</strong> dan otomasi proses internal berulang dengan pendekatan <em>human-in-the-loop</em>.',
 'Konsultasi Integrasi', '#kontak', 'Lihat Sektor Industri', '#sektor', 'rgba(0,184,217,.24)',
 'Integration & AI Engine', 'Data Flow Terpusat', 'Legacy · IoT · Payment · AI',
 'REST API,Middleware,AI Chatbot,Payment Gateway,Document Processing',
 JSON_ARRAY(JSON_OBJECT('v','Legacy','l','Migrasi Sistem Aman'),JSON_OBJECT('v','IoT','l','Device Connectivity'),JSON_OBJECT('v','AI','l','Chatbot & Otomasi')), 3, '/img/banners/integration-ai.svg', 'Integrasi Sistem dan AI Automation', 0),

('cloud-managed-it', 'Infrastruktur', 'yang Terkelola', 'Cloud Server & Managed IT',
 'Server, <strong>monitoring 24/7</strong>, <strong>backup & disaster recovery</strong>, domain, SSL, dan email enterprise ditangani tim kami — Anda fokus pada operasi bisnis inti tanpa terbebani oleh sistem.',
 'Audit Infrastruktur Anda', '#kontak', 'Lihat Garansi Layanan', '#garansi', 'rgba(96,165,250,.26)',
 'Managed Cloud Operations', 'System Health Monitor', 'Uptime · Traffic · Alerting',
 'Cloud Server,Virtualization,Backup & DR,Domain & SSL,Email Enterprise',
 JSON_ARRAY(JSON_OBJECT('v','24/7','l','Monitoring & Incident Response'),JSON_OBJECT('v','DR','l','Backup & Recovery'),JSON_OBJECT('v','Terukur','l','Uptime & Performansi')), 4, '/img/banners/cloud-managed-it.svg', 'Infrastruktur Cloud dan Managed IT', 0)
ON DUPLICATE KEY UPDATE title = VALUES(title), title_highlight = VALUES(title_highlight), eyebrow = VALUES(eyebrow), description = VALUES(description), cta_label = VALUES(cta_label), cta_url = VALUES(cta_url), cta2_label = VALUES(cta2_label), cta2_url = VALUES(cta2_url), accent = VALUES(accent), visual_title = VALUES(visual_title), visual_label = VALUES(visual_label), visual_caption = VALUES(visual_caption), chips = VALUES(chips), badges = VALUES(badges), sort_order = VALUES(sort_order), image_url = VALUES(image_url), image_alt = VALUES(image_alt), show_caption = VALUES(show_caption), is_active = 1;
