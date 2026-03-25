-- ============================================================
--  Rental Clothes — MySQL Schema
--  Run this file once to set up the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS rental_clothes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rental_clothes;

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username         VARCHAR(50)  NOT NULL UNIQUE,
  email            VARCHAR(100) NOT NULL UNIQUE,
  password         VARCHAR(255) NOT NULL,
  full_name        VARCHAR(100) NOT NULL,
  phone            VARCHAR(20),
  address          TEXT,
  role             ENUM('customer','admin') DEFAULT 'customer',
  rental_count     INT UNSIGNED DEFAULT 0,
  total_spent      DECIMAL(10,2) DEFAULT 0,
  late_count       INT UNSIGNED DEFAULT 0,
  is_blacklisted   TINYINT(1) DEFAULT 0,
  blacklist_reason TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Products ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  description    TEXT,
  category       ENUM('wedding_dress','thai_costume','suit_tuxedo','cosplay','sweater','academic_robe','shirt','other') DEFAULT 'other',
  occasion       ENUM('wedding','party','ceremony','graduation','casual','other') DEFAULT 'other',
  price_per_day  DECIMAL(8,2) NOT NULL,
  deposit        DECIMAL(8,2) DEFAULT 0,
  stock          INT UNSIGNED DEFAULT 1,
  sizes          VARCHAR(100) COMMENT 'e.g. XS,S,M,L,XL',
  is_deleted     TINYINT(1) DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Product Images ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  image_url  VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── Bookings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           INT UNSIGNED NOT NULL,
  product_id        INT UNSIGNED NOT NULL,
  rental_start      DATE NOT NULL,
  rental_end        DATE NOT NULL,
  size              VARCHAR(10),
  quantity          INT UNSIGNED DEFAULT 1,
  total_price       DECIMAL(10,2) NOT NULL,
  deposit_amount    DECIMAL(10,2) DEFAULT 0,
  payment_method    ENUM('promptpay','credit_card','bank_transfer') DEFAULT 'promptpay',
  payment_status    ENUM('pending','paid') DEFAULT 'pending',
  payment_proof     VARCHAR(255) COMMENT 'slip filename',
  shipping_address  TEXT,
  status            ENUM('waiting','packing','shipped','received','cancelled') DEFAULT 'waiting',
  tracking_number   VARCHAR(50),
  shipping_carrier  VARCHAR(50),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ── Seed: default admin account ────────────────────────────
-- Password: admin1234  (bcrypt hash)
INSERT IGNORE INTO users (username, email, password, full_name, phone, role)
VALUES (
  'admin',
  'admin@rentalclothes.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Admin',
  '055-555-5555',
  'admin'
);