CREATE TABLE IF NOT EXISTS booking_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  customer_id INT NOT NULL,
  status ENUM('ACTIVE', 'CONSUMED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  UNIQUE KEY uq_booking_sessions_token_hash (token_hash),
  INDEX idx_booking_sessions_customer_status (customer_id, status),
  INDEX idx_booking_sessions_status_expires_at (status, expires_at),
  CONSTRAINT fk_booking_sessions_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT
);
