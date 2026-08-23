CREATE TABLE IF NOT EXISTS groomings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  daily_operation_id INT NOT NULL,
  pet_id INT NOT NULL,
  before_condition TEXT NULL,
  actual_grooming_content TEXT NULL,
  grooming_result TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_groomings_daily_operation
    FOREIGN KEY (daily_operation_id) REFERENCES daily_operations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_groomings_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id)
    ON DELETE RESTRICT,
  UNIQUE KEY uq_groomings_daily_operation_pet (daily_operation_id, pet_id),
  INDEX idx_groomings_daily_operation_id (daily_operation_id),
  INDEX idx_groomings_pet_id (pet_id)
);
