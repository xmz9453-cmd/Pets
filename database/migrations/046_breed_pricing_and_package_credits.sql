UPDATE shops
SET service_packages_enabled = TRUE;

CREATE TABLE shop_pet_breed_prices (
  shop_id INT NOT NULL,
  breed VARCHAR(100) NOT NULL,
  bath_price DECIMAL(10,2) NULL,
  bath_price_is_starting BOOLEAN NOT NULL DEFAULT TRUE,
  electric_clipper_price DECIMAL(10,2) NULL,
  hand_scissor_price DECIMAL(10,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (shop_id, breed),
  CONSTRAINT fk_shop_pet_breed_prices_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

INSERT INTO shop_pet_breed_prices
  (shop_id, breed, bath_price, bath_price_is_starting, electric_clipper_price, hand_scissor_price)
SELECT shop.id, price.breed, price.bath_price, TRUE, price.electric_clipper_price, price.hand_scissor_price
FROM shops shop
INNER JOIN (
  SELECT '茶杯犬／幼犬2公斤內' AS breed, 400 AS bath_price, 800 AS electric_clipper_price, 1200 AS hand_scissor_price
  UNION ALL SELECT '貴賓', 500, 1000, 1500
  UNION ALL SELECT '瑪爾', 450, 900, 1350
  UNION ALL SELECT '臘腸', 500, 1000, NULL
  UNION ALL SELECT '法鬥', 600, 1200, NULL
  UNION ALL SELECT '比熊', 700, 1400, 2100
  UNION ALL SELECT '狐狸', 700, 1400, 2100
  UNION ALL SELECT '博美', 500, 1000, 1500
  UNION ALL SELECT '西施', 500, 1000, 1500
  UNION ALL SELECT '米克斯', 600, 1200, NULL
  UNION ALL SELECT '柴犬', 700, 1400, NULL
  UNION ALL SELECT '柯基', 700, 1400, NULL
  UNION ALL SELECT '雪納瑞', 550, 1100, 1650
  UNION ALL SELECT '約克夏', 450, 900, 1350
  UNION ALL SELECT '吉娃娃', 450, 900, NULL
  UNION ALL SELECT '米格魯', 700, 1400, NULL
  UNION ALL SELECT '哈士奇', 1800, 3600, 5400
  UNION ALL SELECT '邊境', 1000, 2000, 3000
  UNION ALL SELECT '松獅', 1800, 3600, 5400
  UNION ALL SELECT '標貴', 1600, 3200, 4800
  UNION ALL SELECT '拉不拉多', 1200, 2400, NULL
  UNION ALL SELECT '黃金獵犬', 1500, 3000, 4500
  UNION ALL SELECT '德國狼犬', 2000, 4000, 6000
  UNION ALL SELECT '古代牧羊犬', 1600, 3200, 4800
  UNION ALL SELECT '惡霸', 1000, NULL, NULL
  UNION ALL SELECT '羅威納', 2500, NULL, NULL
  UNION ALL SELECT '伯恩山', 2000, 4000, 6000
  UNION ALL SELECT '大白熊', 3000, 6000, 9000
  UNION ALL SELECT '其他犬種', NULL, NULL, NULL
) price
WHERE shop.name LIKE '%睦夏%'
  AND shop.name NOT LIKE '%小琉球%'
ON DUPLICATE KEY UPDATE
  bath_price = VALUES(bath_price),
  bath_price_is_starting = VALUES(bath_price_is_starting),
  electric_clipper_price = VALUES(electric_clipper_price),
  hand_scissor_price = VALUES(hand_scissor_price);

INSERT INTO shop_pet_breed_prices
  (shop_id, breed, bath_price, bath_price_is_starting, electric_clipper_price, hand_scissor_price)
SELECT shop.id, price.breed, price.bath_price, TRUE, price.electric_clipper_price, price.hand_scissor_price
FROM shops shop
INNER JOIN (
  SELECT '茶杯犬／幼犬2公斤內' AS breed, 550 AS bath_price, 1000 AS electric_clipper_price, 1350 AS hand_scissor_price
  UNION ALL SELECT '貴賓', 650, 1200, 1650
  UNION ALL SELECT '瑪爾', 600, 1100, 1500
  UNION ALL SELECT '臘腸', 650, 1200, NULL
  UNION ALL SELECT '法鬥', 700, 1400, NULL
  UNION ALL SELECT '比熊', 850, 1600, 2250
  UNION ALL SELECT '狐狸', 850, 1600, 2250
  UNION ALL SELECT '博美', 650, 1200, 1650
  UNION ALL SELECT '西施', 650, 1200, 1650
  UNION ALL SELECT '米克斯', 750, 1400, NULL
  UNION ALL SELECT '柴犬', 850, 1600, NULL
  UNION ALL SELECT '柯基', 850, 1600, NULL
  UNION ALL SELECT '雪納瑞', 700, 1300, 1800
  UNION ALL SELECT '約克夏', 600, 1100, 1500
  UNION ALL SELECT '吉娃娃', 600, 1100, NULL
  UNION ALL SELECT '米格魯', 850, 1600, NULL
  UNION ALL SELECT '哈士奇', 1950, 3800, 5550
  UNION ALL SELECT '邊境', 1150, 2200, 3150
  UNION ALL SELECT '德國狼犬', 2150, 4200, 6150
  UNION ALL SELECT '古代牧羊犬', 1750, 3400, 4950
  UNION ALL SELECT '惡霸', 1150, NULL, NULL
  UNION ALL SELECT '羅威納', 2650, NULL, NULL
  UNION ALL SELECT '伯恩山', 2150, 4200, 6150
  UNION ALL SELECT '大白熊', 3150, 6200, 9150
  UNION ALL SELECT '其他犬種', NULL, NULL, NULL
) price
WHERE shop.name LIKE '%小琉球%'
ON DUPLICATE KEY UPDATE
  bath_price = VALUES(bath_price),
  bath_price_is_starting = VALUES(bath_price_is_starting),
  electric_clipper_price = VALUES(electric_clipper_price),
  hand_scissor_price = VALUES(hand_scissor_price);

ALTER TABLE services
  ADD COLUMN breed_price_category ENUM('STANDARD', 'BATH', 'ELECTRIC_CLIPPER', 'HAND_SCISSOR') NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN package_point_cost TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD CONSTRAINT chk_services_package_point_cost CHECK (package_point_cost <= 3);

UPDATE services
SET breed_price_category = 'BATH',
    package_point_cost = 1
WHERE type = 'GROOMING' AND name LIKE '%洗澡%';

UPDATE services
SET breed_price_category = 'ELECTRIC_CLIPPER',
    package_point_cost = 2
WHERE type = 'GROOMING' AND (name LIKE '%電剪%' OR name LIKE '%電推%');

UPDATE services
SET breed_price_category = 'HAND_SCISSOR',
    package_point_cost = 3
WHERE type = 'GROOMING' AND (name LIKE '%全手%' OR name LIKE '%手剪%');

ALTER TABLE customer_service_packages
  ADD COLUMN is_point_package BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN purchase_price DECIMAL(10,2) NULL AFTER is_point_package;

UPDATE service_package_plans
SET usage_count = 5;

UPDATE service_package_plan_services plan_service
INNER JOIN service_package_plans plan
  ON plan.id = plan_service.plan_id AND plan.shop_id = plan_service.shop_id
SET plan_service.included_uses = 2
WHERE plan.offer_type = 'BATH_THREE_FULL_GROOM'
  AND plan_service.included_uses = 1;

ALTER TABLE customer_service_package_transactions
  DROP INDEX uq_customer_service_package_redemption,
  ADD UNIQUE KEY uq_customer_service_package_redemption_item
    (shop_id, customer_service_package_id, appointment_id, transaction_type, order_item_id);
