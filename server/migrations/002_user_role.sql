-- Rôle utilisateur : seuls les comptes "admin" peuvent publier des annonces.
-- Exécuter après 001_production_extras.sql si la base existait déjà.

ALTER TABLE users
  ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
  AFTER password_hash;
