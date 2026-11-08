ALTER TABLE products
  ADD COLUMN image_storage_key VARCHAR(64) NULL,
  ADD COLUMN image_mime_type VARCHAR(32) NULL,
  ADD COLUMN image_file_size INT UNSIGNED NULL,
  ADD COLUMN image_original_filename VARCHAR(255) NULL;

CREATE TABLE grooming_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  grooming_id INT NOT NULL,
  category ENUM('BEFORE', 'AFTER', 'CONCERN') NOT NULL,
  storage_key VARCHAR(64) NOT NULL,
  mime_type VARCHAR(32) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_grooming_photos_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_grooming_photos_grooming FOREIGN KEY (grooming_id) REFERENCES groomings(id) ON DELETE CASCADE,
  UNIQUE KEY uq_grooming_photos_storage_key (storage_key),
  INDEX idx_grooming_photos_shop_grooming (shop_id, grooming_id, category, id)
);
