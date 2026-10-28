CREATE TABLE IF NOT EXISTS shops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shops_slug (slug)
);

INSERT INTO shops (id, name, slug)
VALUES (1, 'My Shop', 'main')
ON DUPLICATE KEY UPDATE id = VALUES(id);

UPDATE shops
SET name = COALESCE((SELECT name FROM shop_settings ORDER BY id DESC LIMIT 1), name)
WHERE id = 1;

CREATE TABLE IF NOT EXISTS staff_shop_memberships (
  staff_id INT NOT NULL,
  shop_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (staff_id, shop_id),
  CONSTRAINT fk_staff_shop_memberships_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_shop_memberships_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staff_shop_roles (
  staff_id INT NOT NULL,
  shop_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (staff_id, shop_id, role_id),
  CONSTRAINT fk_staff_shop_roles_membership FOREIGN KEY (staff_id, shop_id)
    REFERENCES staff_shop_memberships(staff_id, shop_id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_shop_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_shop_managers (
  staff_id INT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_platform_shop_managers_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

INSERT IGNORE INTO staff_shop_memberships (staff_id, shop_id)
SELECT id, 1 FROM staff;

INSERT IGNORE INTO staff_shop_roles (staff_id, shop_id, role_id)
SELECT staff_id, 1, role_id FROM staff_roles;

INSERT IGNORE INTO platform_shop_managers (staff_id)
SELECT sr.staff_id
FROM staff_roles sr
INNER JOIN roles r ON r.id = sr.role_id
WHERE r.code = 'OWNER';

ALTER TABLE shop_settings
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_shop_settings_shop_id (shop_id),
  ADD CONSTRAINT fk_shop_settings_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE shop_business_hours
  DROP INDEX uq_shop_business_hours_weekday,
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_shop_business_hours_shop_weekday (shop_id, weekday),
  ADD CONSTRAINT fk_shop_business_hours_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE customers
  DROP INDEX uq_customers_phone,
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_customers_shop_phone (shop_id, phone),
  ADD KEY idx_customers_shop_id (shop_id),
  ADD CONSTRAINT fk_customers_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE pets
  DROP INDEX uq_pets_chip_number,
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_pets_shop_chip_number (shop_id, chip_number),
  ADD KEY idx_pets_shop_id (shop_id),
  ADD CONSTRAINT fk_pets_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE pet_customer_relationships
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_pet_customer_relationships_shop_id (shop_id),
  ADD CONSTRAINT fk_pet_customer_relationships_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE services
  DROP INDEX uq_services_name_species,
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_services_shop_name_species (shop_id, name, species),
  ADD KEY idx_services_shop_id (shop_id),
  ADD CONSTRAINT fk_services_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE appointments
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_appointments_shop_id (shop_id),
  ADD CONSTRAINT fk_appointments_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE appointment_pets
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_appointment_pets_shop_id (shop_id),
  ADD CONSTRAINT fk_appointment_pets_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE appointment_pet_services
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_appointment_pet_services_shop_id (shop_id),
  ADD CONSTRAINT fk_appointment_pet_services_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE daily_operations
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_daily_operations_shop_id (shop_id),
  ADD CONSTRAINT fk_daily_operations_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE groomings
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_groomings_shop_id (shop_id),
  ADD CONSTRAINT fk_groomings_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE boardings
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_boardings_shop_id (shop_id),
  ADD CONSTRAINT fk_boardings_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE products
  DROP INDEX uq_products_name,
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_products_shop_name (shop_id, name),
  ADD KEY idx_products_shop_id (shop_id),
  ADD CONSTRAINT fk_products_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE orders
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_orders_shop_id (shop_id),
  ADD CONSTRAINT fk_orders_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE order_items
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_order_items_shop_id (shop_id),
  ADD CONSTRAINT fk_order_items_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE payments
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_payments_shop_id (shop_id),
  ADD CONSTRAINT fk_payments_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE booking_schedule_rules
  DROP INDEX uq_booking_schedule_rules_species_start_time,
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_booking_schedule_rules_shop_species_start_time (shop_id, species, start_time),
  ADD KEY idx_booking_schedule_rules_shop_id (shop_id),
  ADD CONSTRAINT fk_booking_schedule_rules_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE booking_schedule_overrides
  DROP INDEX uq_booking_schedule_overrides_scope,
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_booking_schedule_overrides_shop_scope (
    shop_id, override_date, species, start_time_scope, start_time_key
  ),
  ADD KEY idx_booking_schedule_overrides_shop_id (shop_id),
  ADD CONSTRAINT fk_booking_schedule_overrides_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE booking_sessions
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_booking_sessions_shop_id (shop_id),
  ADD CONSTRAINT fk_booking_sessions_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE contract_versions
  DROP INDEX uq_contract_versions_version_label,
  DROP INDEX uq_contract_versions_current_slot,
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_contract_versions_shop_label (shop_id, version_label),
  ADD UNIQUE KEY uq_contract_versions_shop_current_slot (shop_id, current_slot),
  ADD KEY idx_contract_versions_shop_id (shop_id),
  ADD CONSTRAINT fk_contract_versions_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE onboardings
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_onboardings_shop_id (shop_id),
  ADD CONSTRAINT fk_onboardings_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE onboarding_pets
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_onboarding_pets_shop_id (shop_id),
  ADD CONSTRAINT fk_onboarding_pets_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE contract_history
  ADD COLUMN shop_id INT NOT NULL DEFAULT 1,
  ADD KEY idx_contract_history_shop_id (shop_id),
  ADD CONSTRAINT fk_contract_history_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

ALTER TABLE shop_settings ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE shop_business_hours ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE customers ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE pets ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE pet_customer_relationships ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE services ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE appointments ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE appointment_pets ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE appointment_pet_services ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE daily_operations ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE groomings ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE boardings ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE products ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE order_items ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE payments ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE booking_schedule_rules ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE booking_schedule_overrides ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE booking_sessions ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE contract_versions ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE onboardings ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE onboarding_pets ALTER COLUMN shop_id DROP DEFAULT;
ALTER TABLE contract_history ALTER COLUMN shop_id DROP DEFAULT;
