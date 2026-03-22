-- Fiche technique « contact général » (non listée publiquement) pour ouvrir une conversation avec l’admin.
ALTER TABLE listings
  ADD COLUMN is_contact_hub TINYINT(1) NOT NULL DEFAULT 0
  AFTER is_active;
