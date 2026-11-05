CREATE TABLE portal_backgrounds (
  id INT NOT NULL AUTO_INCREMENT,
  storage_key VARCHAR(40) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(30) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN is_active = 1 THEN 1 ELSE NULL END) STORED,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portal_backgrounds_storage_key (storage_key),
  UNIQUE KEY uq_portal_backgrounds_active_slot (active_slot),
  CONSTRAINT fk_portal_backgrounds_created_by
    FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL
);
