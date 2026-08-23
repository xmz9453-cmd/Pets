-- TASK-0009: Daily Operations Database Schema
CREATE TABLE IF NOT EXISTS daily_operations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  status ENUM('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
  check_in_time TIMESTAMP NULL,
  started_time TIMESTAMP NULL,
  completed_time TIMESTAMP NULL,
  responsible_staff_id INT NULL,
  work_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_operations_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_daily_operations_staff
    FOREIGN KEY (responsible_staff_id) REFERENCES staff(id)
    ON DELETE SET NULL,
  UNIQUE KEY uq_daily_operations_appointment (appointment_id),
  INDEX idx_daily_operations_status (status),
  INDEX idx_daily_operations_created_at (created_at),
  INDEX idx_daily_operations_responsible_staff_id (responsible_staff_id)
);
