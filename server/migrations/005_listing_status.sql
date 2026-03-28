ALTER TABLE listings
  ADD COLUMN status ENUM('available', 'reserved', 'sold') NOT NULL DEFAULT 'available';

CREATE INDEX idx_listings_status ON listings(status);
