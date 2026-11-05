CREATE TABLE IF NOT EXISTS booking_otp_challenges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  phone VARCHAR(30) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  status ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'LOCKED') NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  CONSTRAINT fk_booking_otp_challenges_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_booking_otp_challenges_shop_phone_status (shop_id, phone, status, created_at),
  INDEX idx_booking_otp_challenges_expiry (status, expires_at)
);

CREATE TABLE IF NOT EXISTS booking_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  resource_type ENUM('STAFF', 'GROOMING_STATION', 'BOARDING_ROOM') NOT NULL,
  service_type ENUM('GROOMING', 'BOARDING', 'BOTH') NOT NULL DEFAULT 'BOTH',
  staff_id INT NULL,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_booking_resources_capacity CHECK (capacity > 0),
  CONSTRAINT fk_booking_resources_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_resources_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_booking_resources_shop_name (shop_id, name),
  UNIQUE KEY uq_booking_resources_shop_staff (shop_id, staff_id),
  INDEX idx_booking_resources_shop_type_status (shop_id, resource_type, status)
);

CREATE TABLE IF NOT EXISTS booking_resource_hours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  resource_id INT NOT NULL,
  weekday ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_booking_resource_hours_range CHECK (end_time > start_time),
  CONSTRAINT fk_booking_resource_hours_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_resource_hours_resource FOREIGN KEY (resource_id) REFERENCES booking_resources(id) ON DELETE CASCADE,
  UNIQUE KEY uq_booking_resource_hours_window (resource_id, weekday, start_time, end_time),
  INDEX idx_booking_resource_hours_shop_resource_day (shop_id, resource_id, weekday)
);

CREATE TABLE IF NOT EXISTS booking_resource_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  resource_id INT NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_booking_resource_blocks_range CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  ),
  CONSTRAINT fk_booking_resource_blocks_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_resource_blocks_resource FOREIGN KEY (resource_id) REFERENCES booking_resources(id) ON DELETE CASCADE,
  INDEX idx_booking_resource_blocks_shop_date (shop_id, block_date, resource_id)
);

CREATE TABLE IF NOT EXISTS appointment_resource_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  appointment_id INT NOT NULL,
  resource_id INT NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  units INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_appointment_resource_assignments_range CHECK (end_at > start_at AND units > 0),
  CONSTRAINT fk_appointment_resource_assignments_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointment_resource_assignments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointment_resource_assignments_resource FOREIGN KEY (resource_id) REFERENCES booking_resources(id) ON DELETE RESTRICT,
  INDEX idx_appointment_resource_assignments_overlap (shop_id, resource_id, start_at, end_at)
);

CREATE TABLE IF NOT EXISTS booking_request_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  appointment_id INT NOT NULL,
  service_type ENUM('GROOMING', 'BOARDING') NOT NULL,
  requested_check_out DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_booking_request_details_dates CHECK (
    (service_type = 'GROOMING' AND requested_check_out IS NULL)
    OR (service_type = 'BOARDING' AND requested_check_out IS NOT NULL)
  ),
  CONSTRAINT fk_booking_request_details_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_request_details_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  UNIQUE KEY uq_booking_request_details_appointment (appointment_id)
);
