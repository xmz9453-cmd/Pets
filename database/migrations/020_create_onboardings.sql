CREATE TABLE IF NOT EXISTS onboardings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  public_token_hash CHAR(64) NOT NULL,
  contract_version_id INT NOT NULL,
  status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'NOT_STARTED',
  customer_data JSON NULL,
  appointment_data JSON NULL,
  customer_resolution ENUM('UNRESOLVED', 'EXISTING', 'NEW') NOT NULL DEFAULT 'UNRESOLVED',
  matched_customer_id INT NULL,
  customer_candidates JSON NULL,
  created_by_staff_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME GENERATED ALWAYS AS (DATE_ADD(created_at, INTERVAL 168 HOUR)) STORED,
  completed_at DATETIME NULL,
  UNIQUE KEY uq_onboardings_public_token_hash (public_token_hash),
  INDEX idx_onboardings_status_expires_at (status, expires_at),
  CONSTRAINT fk_onboardings_contract_version
    FOREIGN KEY (contract_version_id) REFERENCES contract_versions(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_onboardings_staff
    FOREIGN KEY (created_by_staff_id) REFERENCES staff(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_onboardings_customer
    FOREIGN KEY (matched_customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS onboarding_pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  onboarding_id INT NOT NULL,
  pet_data JSON NULL,
  resolution ENUM('UNRESOLVED', 'EXISTING', 'NEW') NOT NULL DEFAULT 'UNRESOLVED',
  matched_pet_id INT NULL,
  candidates JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_onboarding_pets_onboarding_id (onboarding_id),
  CONSTRAINT fk_onboarding_pets_onboarding
    FOREIGN KEY (onboarding_id) REFERENCES onboardings(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_onboarding_pets_pet
    FOREIGN KEY (matched_pet_id) REFERENCES pets(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS contract_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  onboarding_id INT NOT NULL,
  customer_id INT NOT NULL,
  pet_id INT NOT NULL,
  appointment_id INT NOT NULL,
  contract_version_id INT NOT NULL,
  version VARCHAR(50) NOT NULL,
  pdf_hash CHAR(64) NOT NULL,
  storage_path VARCHAR(1000) NOT NULL,
  agreed_at DATETIME NOT NULL,
  signature_evidence MEDIUMBLOB NOT NULL,
  signature_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contract_history_onboarding_id (onboarding_id),
  CONSTRAINT fk_contract_history_onboarding
    FOREIGN KEY (onboarding_id) REFERENCES onboardings(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_contract_history_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_contract_history_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_contract_history_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_contract_history_version
    FOREIGN KEY (contract_version_id) REFERENCES contract_versions(id)
    ON DELETE RESTRICT
);
