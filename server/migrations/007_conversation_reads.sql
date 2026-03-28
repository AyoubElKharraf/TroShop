-- Suivi de lecture par participant (messagerie Sprint 2)
ALTER TABLE conversations
  ADD COLUMN buyer_last_read_at TIMESTAMP(3) NULL DEFAULT NULL,
  ADD COLUMN seller_last_read_at TIMESTAMP(3) NULL DEFAULT NULL;
