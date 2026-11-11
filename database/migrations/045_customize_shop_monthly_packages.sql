ALTER TABLE shops
  ADD COLUMN service_packages_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE shops
SET service_packages_enabled = FALSE
WHERE name = '橙藝貓旅美容SPA館';

ALTER TABLE service_package_plans
  ADD COLUMN offer_type ENUM('BATH_FIVE', 'BATH_THREE_FULL_GROOM') NULL AFTER description;

ALTER TABLE service_package_plan_services
  ADD COLUMN included_uses INT UNSIGNED NOT NULL DEFAULT 1 AFTER service_id,
  ADD CONSTRAINT chk_service_package_plan_services_uses CHECK (included_uses > 0);

ALTER TABLE customer_service_package_transactions
  ADD COLUMN service_id INT NULL AFTER transaction_type,
  ADD CONSTRAINT fk_customer_service_package_transactions_service
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT;

CREATE TABLE customer_service_package_balances (
  shop_id INT NOT NULL,
  customer_service_package_id BIGINT UNSIGNED NOT NULL,
  service_id INT NOT NULL,
  purchased_uses INT UNSIGNED NOT NULL,
  remaining_uses INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (shop_id, customer_service_package_id, service_id),
  CONSTRAINT fk_customer_service_package_balances_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_service_package_balances_package
    FOREIGN KEY (customer_service_package_id) REFERENCES customer_service_packages(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_service_package_balances_service
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CHECK (purchased_uses > 0),
  CHECK (remaining_uses <= purchased_uses)
);
