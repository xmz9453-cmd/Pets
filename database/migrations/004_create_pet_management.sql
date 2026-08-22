CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address VARCHAR(255) NULL,
  line_id VARCHAR(100) NULL,
  note TEXT NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customers_phone (phone),
  INDEX idx_customers_name (name),
  INDEX idx_customers_status (status)
);

CREATE TABLE IF NOT EXISTS pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  species ENUM('DOG', 'CAT') NOT NULL,
  breed VARCHAR(100) NULL,
  gender ENUM('MALE', 'FEMALE', 'UNKNOWN') NOT NULL,
  birth_date DATE NULL,
  weight DECIMAL(8,2) NULL,
  weight_unit ENUM('KG', 'LB') NULL,
  chip_number VARCHAR(100) NULL,
  photo_url VARCHAR(500) NULL,
  notes TEXT NULL,
  special_notes TEXT NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pets_chip_number (chip_number),
  INDEX idx_pets_name (name),
  INDEX idx_pets_species (species),
  INDEX idx_pets_status (status),
  CHECK (weight IS NULL OR weight > 0),
  CHECK (weight IS NULL OR weight <= 300)
);

CREATE TABLE IF NOT EXISTS pet_customer_relationships (
  pet_id INT NOT NULL,
  customer_id INT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pet_id, customer_id),
  INDEX idx_pet_customer_customer_id (customer_id),
  INDEX idx_pet_customer_primary (pet_id, is_primary),
  CONSTRAINT fk_pet_customer_relationships_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pet_customer_relationships_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT
);
