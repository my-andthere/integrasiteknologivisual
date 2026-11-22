-- =========================================================
--  PT. Integration Teknologi Visual — Karier & Open Partner
--  ---------------------------------------------------------
--  Tabel untuk lowongan kerja, program magang & PKL, serta
--  program kemitraan terbuka (Open Partner).
--
--  Jalankan SEKALI, idempotent (aman diulang):
--    mysql -u itv_user -p itv_corporate < server/schema-careers.sql
--
--  PENTING: JANGAN jalankan server/init-db.js — skrip itu akan
--  menimpa logo/banner yang sudah diunggah lewat CMS.
-- =========================================================

SET NAMES utf8mb4;

-- =========================================================
-- 1. Lowongan kerja, program magang, dan PKL
-- =========================================================
CREATE TABLE IF NOT EXISTS `job_openings` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `slug`          VARCHAR(180) NOT NULL UNIQUE,
  `title`         VARCHAR(160) NOT NULL,
  -- Lowongan (karyawan tetap) | Magang (internship) | PKL (praktik kerja lapangan)
  `type`          VARCHAR(20)  NOT NULL DEFAULT 'lowongan',
  `department`    VARCHAR(80)  NULL,
  `location`      VARCHAR(120) NULL,
  -- Onsite | Hybrid | Remote
  `work_mode`     VARCHAR(20)  NOT NULL DEFAULT 'Onsite',
  -- Full-time | Part-time | Kontrak
  `employment`    VARCHAR(40)  NOT NULL DEFAULT 'Full-time',
  `description`   TEXT         NULL,
  `requirements`  JSON         NULL,
  `benefits`      JSON         NULL,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`    INT          NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_job_openings_type (type, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 2. Program Open Partner (kemitraan terbuka)
-- =========================================================
CREATE TABLE IF NOT EXISTS `partner_programs` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `slug`          VARCHAR(180) NOT NULL UNIQUE,
  `title`         VARCHAR(160) NOT NULL,
  -- Reseller | Integrator | Technology | OEM | Referral | Cloud
  `category`      VARCHAR(40)  NOT NULL DEFAULT 'Technology',
  `description`   TEXT         NULL,
  `benefits`      JSON         NULL,
  `requirements`  JSON         NULL,
  `cta_label`     VARCHAR(80)  NULL,
  `cta_url`       VARCHAR(255) NULL,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`    INT          NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_partner_programs_cat (category, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 3. Kolom terjemahan EN / JA
-- =========================================================
ALTER TABLE `job_openings`     ADD COLUMN IF NOT EXISTS `translations` JSON NULL COMMENT 'Terjemahan EN/JA per field';
ALTER TABLE `partner_programs` ADD COLUMN IF NOT EXISTS `translations` JSON NULL COMMENT 'Terjemahan EN/JA per field';
