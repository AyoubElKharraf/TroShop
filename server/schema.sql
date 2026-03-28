-- TrocSpot — schéma MySQL (équivalent fonctionnel du projet Supabase/PostgreSQL)
-- Exécuter après création de la base : CREATE DATABASE trocspot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET NAMES utf8mb4;

CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT,
  location VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE listings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('vetements', 'livres', 'materiel') NOT NULL,
  listing_type ENUM('vente', 'location') NOT NULL DEFAULT 'vente',
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  price_period ENUM('jour', 'semaine', 'mois') NULL,
  `condition` ENUM('neuf', 'comme_neuf', 'bon', 'acceptable') NOT NULL DEFAULT 'bon',
  location VARCHAR(255),
  images JSON,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('available', 'reserved', 'sold') NOT NULL DEFAULT 'available',
  is_contact_hub TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_listings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_listings_category (category),
  INDEX idx_listings_type (listing_type),
  INDEX idx_listings_user (user_id),
  INDEX idx_listings_active (is_active),
  INDEX idx_listings_status (status)
);

CREATE TABLE conversations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  listing_id CHAR(36) NOT NULL,
  buyer_id CHAR(36) NOT NULL,
  seller_id CHAR(36) NOT NULL,
  buyer_last_read_at TIMESTAMP(3) NULL DEFAULT NULL,
  seller_last_read_at TIMESTAMP(3) NULL DEFAULT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_listing_buyer (listing_id, buyer_id),
  CONSTRAINT fk_conv_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id)
);

CREATE TABLE password_reset_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP(3) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_pwdreset_user (user_id),
  INDEX idx_pwdreset_hash (token_hash),
  CONSTRAINT fk_pwdreset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE listing_reports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  listing_id CHAR(36) NOT NULL,
  reporter_id CHAR(36) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_listing_reporter (listing_id, reporter_id),
  CONSTRAINT fk_report_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE favorites (
  user_id CHAR(36) NOT NULL,
  listing_id CHAR(36) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, listing_id),
  INDEX idx_favorites_listing (listing_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'message',
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link_path VARCHAR(512) NULL,
  read_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_notifications_user_created (user_id, created_at DESC),
  INDEX idx_notifications_user_unread (user_id, read_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_preferences (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  notify_messages TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
