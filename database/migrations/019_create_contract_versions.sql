CREATE TABLE IF NOT EXISTS contract_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version_label VARCHAR(50) NOT NULL,
  status ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  current_slot TINYINT GENERATED ALWAYS AS (
    CASE WHEN is_current = TRUE THEN 1 ELSE NULL END
  ) STORED,
  file_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  file_size INT UNSIGNED NULL,
  storage_path VARCHAR(1000) NULL,
  file_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contract_versions_version_label (version_label),
  UNIQUE KEY uq_contract_versions_current_slot (current_slot),
  INDEX idx_contract_versions_status (status),
  CONSTRAINT chk_contract_versions_current_published
    CHECK (is_current = FALSE OR status = 'PUBLISHED')
);