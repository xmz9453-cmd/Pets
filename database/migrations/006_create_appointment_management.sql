CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_services_status (status),
  INDEX idx_services_name (name)
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  staff_id INT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('PENDING', 'SCHEDULED', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_staff
    FOREIGN KEY (staff_id) REFERENCES staff(id)
    ON DELETE SET NULL,
  INDEX idx_appointments_customer_id (customer_id),
  INDEX idx_appointments_date_time (appointment_date, appointment_time),
  INDEX idx_appointments_status (status)
);

CREATE TABLE IF NOT EXISTS appointment_pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  pet_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointment_pets_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_appointment_pets_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id)
    ON DELETE RESTRICT,
  UNIQUE KEY uq_appointment_pets_appointment_pet (appointment_id, pet_id),
  INDEX idx_appointment_pets_pet_id (pet_id)
);

CREATE TABLE IF NOT EXISTS appointment_pet_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_pet_id INT NOT NULL,
  service_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointment_pet_services_appointment_pet
    FOREIGN KEY (appointment_pet_id) REFERENCES appointment_pets(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_appointment_pet_services_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE RESTRICT,
  UNIQUE KEY uq_appointment_pet_services_unique (appointment_pet_id, service_id),
  INDEX idx_appointment_pet_services_service_id (service_id)
);
