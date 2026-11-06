CREATE TABLE booking_change_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  appointment_id INT NOT NULL,
  customer_member_id BIGINT UNSIGNED NOT NULL,
  request_type ENUM('RESCHEDULE', 'CANCEL') NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  original_appointment_date DATE NOT NULL,
  original_appointment_time TIME NOT NULL,
  original_check_out DATETIME NULL,
  proposed_appointment_date DATE NULL,
  proposed_appointment_time TIME NULL,
  proposed_check_out DATETIME NULL,
  customer_note VARCHAR(500) NULL,
  staff_note VARCHAR(500) NULL,
  reviewed_by_staff_id INT NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_booking_change_request_proposal CHECK (
    (request_type = 'CANCEL'
      AND proposed_appointment_date IS NULL
      AND proposed_appointment_time IS NULL
      AND proposed_check_out IS NULL)
    OR (request_type = 'RESCHEDULE'
      AND proposed_appointment_date IS NOT NULL
      AND proposed_appointment_time IS NOT NULL)
  ),
  CONSTRAINT fk_booking_change_requests_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_change_requests_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_change_requests_member
    FOREIGN KEY (customer_member_id) REFERENCES customer_members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_change_requests_reviewer
    FOREIGN KEY (reviewed_by_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_booking_change_requests_appointment (appointment_id),
  INDEX idx_booking_change_requests_appointment_status (shop_id, appointment_id, status),
  INDEX idx_booking_change_requests_shop_status (shop_id, status, created_at),
  INDEX idx_booking_change_requests_member (shop_id, customer_member_id, created_at)
);

CREATE TABLE shop_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  booking_change_request_id INT NOT NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shop_notifications_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_notifications_booking_change_request
    FOREIGN KEY (booking_change_request_id) REFERENCES booking_change_requests(id) ON DELETE CASCADE,
  UNIQUE KEY uq_shop_notifications_booking_change_request (booking_change_request_id),
  INDEX idx_shop_notifications_unread (shop_id, read_at, created_at)
);
