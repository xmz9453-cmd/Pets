CREATE TABLE service_package_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  term ENUM('MONTH', 'QUARTER') NOT NULL,
  usage_count INT UNSIGNED NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  species ENUM('DOG', 'CAT', 'BOTH') NOT NULL DEFAULT 'BOTH',
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_service_package_plans_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  UNIQUE KEY uq_service_package_plans_shop_name (shop_id, name),
  INDEX idx_service_package_plans_shop_status (shop_id, status),
  CHECK (usage_count > 0),
  CHECK (price > 0)
);

CREATE TABLE service_package_plan_services (
  shop_id INT NOT NULL,
  plan_id INT NOT NULL,
  service_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (shop_id, plan_id, service_id),
  CONSTRAINT fk_service_package_plan_services_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_package_plan_services_plan FOREIGN KEY (plan_id) REFERENCES service_package_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_package_plan_services_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  INDEX idx_service_package_plan_services_service (shop_id, service_id)
);

CREATE TABLE customer_service_packages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  plan_id INT NOT NULL,
  customer_id INT NOT NULL,
  pet_id INT NOT NULL,
  purchase_order_id INT NOT NULL,
  purchased_uses INT UNSIGNED NOT NULL,
  remaining_uses INT UNSIGNED NOT NULL,
  starts_on DATE NOT NULL,
  expires_on DATE NOT NULL,
  status ENUM('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'VOID') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_service_packages_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_service_packages_plan FOREIGN KEY (plan_id) REFERENCES service_package_plans(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_service_packages_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_service_packages_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_service_packages_order FOREIGN KEY (purchase_order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_customer_service_packages_order (shop_id, purchase_order_id),
  UNIQUE KEY uq_customer_service_packages_shop_id (shop_id, id),
  INDEX idx_customer_service_packages_customer (shop_id, customer_id, status, expires_on),
  INDEX idx_customer_service_packages_pet (shop_id, pet_id, status, expires_on),
  CHECK (purchased_uses > 0),
  CHECK (remaining_uses <= purchased_uses),
  CHECK (expires_on >= starts_on)
);

CREATE TABLE customer_service_package_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  customer_service_package_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('PURCHASE', 'REDEEM', 'REFUND', 'ADJUSTMENT') NOT NULL,
  change_uses INT NOT NULL,
  appointment_id INT NULL,
  order_id INT NULL,
  order_item_id INT NULL,
  operator_id INT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_service_package_transactions_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_service_package_transactions_package FOREIGN KEY (customer_service_package_id) REFERENCES customer_service_packages(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_service_package_transactions_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_service_package_transactions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_service_package_transactions_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_service_package_transactions_operator FOREIGN KEY (operator_id) REFERENCES staff(id) ON DELETE SET NULL,
  UNIQUE KEY uq_customer_service_package_redemption (shop_id, customer_service_package_id, appointment_id, transaction_type),
  INDEX idx_customer_service_package_transactions_order (shop_id, order_id),
  CHECK (change_uses <> 0)
);

ALTER TABLE order_items
  ADD COLUMN customer_service_package_id BIGINT UNSIGNED NULL AFTER pet_id,
  ADD KEY idx_order_items_customer_service_package (shop_id, customer_service_package_id),
  ADD CONSTRAINT fk_order_items_customer_service_package
    FOREIGN KEY (customer_service_package_id) REFERENCES customer_service_packages(id) ON DELETE RESTRICT;
