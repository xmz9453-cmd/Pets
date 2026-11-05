CREATE TABLE IF NOT EXISTS customer_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(100) NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_member_identities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_member_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('LINE', 'GOOGLE') NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_member_identities_member
    FOREIGN KEY (customer_member_id) REFERENCES customer_members(id) ON DELETE CASCADE,
  UNIQUE KEY uq_customer_member_identity_provider_subject (provider, provider_subject),
  UNIQUE KEY uq_customer_member_identity_member_provider (customer_member_id, provider)
);

CREATE TABLE IF NOT EXISTS customer_member_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  customer_member_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  status ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  authenticated_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_member_sessions_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_member_sessions_member
    FOREIGN KEY (customer_member_id) REFERENCES customer_members(id) ON DELETE CASCADE,
  UNIQUE KEY uq_customer_member_sessions_token_hash (token_hash),
  INDEX idx_customer_member_sessions_shop_status_expiry (shop_id, status, expires_at),
  INDEX idx_customer_member_sessions_member (customer_member_id, shop_id)
);

CREATE TABLE IF NOT EXISTS customer_member_oauth_states (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  provider ENUM('LINE', 'GOOGLE') NOT NULL,
  state_hash CHAR(64) NOT NULL,
  nonce VARCHAR(128) NOT NULL,
  intent ENUM('LOGIN', 'LINK') NOT NULL DEFAULT 'LOGIN',
  customer_member_id BIGINT UNSIGNED NULL,
  session_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  CONSTRAINT fk_customer_member_oauth_states_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_member_oauth_states_member
    FOREIGN KEY (customer_member_id) REFERENCES customer_members(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_member_oauth_states_session
    FOREIGN KEY (session_id) REFERENCES customer_member_sessions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_customer_member_oauth_state_hash (state_hash),
  INDEX idx_customer_member_oauth_states_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS customer_member_customers (
  shop_id INT NOT NULL,
  customer_member_id BIGINT UNSIGNED NOT NULL,
  customer_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (shop_id, customer_member_id, customer_id),
  UNIQUE KEY uq_customer_member_customers_customer (shop_id, customer_id),
  CONSTRAINT fk_customer_member_customers_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_member_customers_member
    FOREIGN KEY (customer_member_id) REFERENCES customer_members(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_member_customers_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customer_member_profiles (
  shop_id INT NOT NULL,
  customer_member_id BIGINT UNSIGNED NOT NULL,
  customer_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (shop_id, customer_member_id),
  UNIQUE KEY uq_customer_member_profiles_customer (shop_id, customer_id),
  CONSTRAINT fk_customer_member_profiles_link
    FOREIGN KEY (shop_id, customer_member_id, customer_id)
    REFERENCES customer_member_customers(shop_id, customer_member_id, customer_id) ON DELETE CASCADE
);

ALTER TABLE customers
  DROP INDEX uq_customers_shop_phone,
  ADD KEY idx_customers_shop_phone (shop_id, phone);

ALTER TABLE appointments
  MODIFY COLUMN status ENUM('PENDING', 'AWAITING_CUSTOMER', 'SCHEDULED', 'CONFIRMED', 'CANCELLED')
    NOT NULL DEFAULT 'SCHEDULED';

ALTER TABLE booking_request_details
  ADD COLUMN customer_member_id BIGINT UNSIGNED NULL AFTER service_type,
  ADD CONSTRAINT fk_booking_request_details_member
    FOREIGN KEY (customer_member_id) REFERENCES customer_members(id) ON DELETE RESTRICT;

ALTER TABLE onboardings
  ADD COLUMN appointment_id INT NULL AFTER contract_version_id,
  ADD COLUMN customer_member_id BIGINT UNSIGNED NULL AFTER appointment_id,
  ADD UNIQUE KEY uq_onboardings_appointment (shop_id, appointment_id),
  ADD KEY idx_onboardings_member (shop_id, customer_member_id),
  ADD CONSTRAINT fk_onboardings_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_onboardings_member
    FOREIGN KEY (customer_member_id) REFERENCES customer_members(id) ON DELETE RESTRICT;

ALTER TABLE products
  ADD COLUMN stock_quantity INT UNSIGNED NOT NULL DEFAULT 0 AFTER price;

CREATE TABLE IF NOT EXISTS booking_request_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  appointment_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  status ENUM('PENDING', 'RESERVED', 'RELEASED', 'FULFILLED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_booking_request_products_values CHECK (unit_price >= 0 AND quantity > 0),
  CONSTRAINT fk_booking_request_products_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_request_products_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_request_products_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_booking_request_products_appointment_product (appointment_id, product_id),
  INDEX idx_booking_request_products_shop_status (shop_id, status, product_id)
);
