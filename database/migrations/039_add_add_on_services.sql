ALTER TABLE services
  MODIFY COLUMN type ENUM('GROOMING', 'BOARDING', 'ADD_ON') NOT NULL DEFAULT 'GROOMING';

INSERT INTO services (
  shop_id, name, type, description, price, unit, allow_fractional_quantity,
  species, duration_minutes, sort_order, status
)
SELECT
  p.shop_id, p.name, 'ADD_ON', p.description, ROUND(p.price), '公里', TRUE,
  p.species, 0, 0, 'ACTIVE'
FROM products p
WHERE p.name = '車資'
  AND NOT EXISTS (
    SELECT 1 FROM services s
    WHERE s.shop_id = p.shop_id AND s.name = p.name AND s.species = p.species
  );

UPDATE products p
INNER JOIN services s
  ON s.shop_id = p.shop_id AND s.name = p.name AND s.species = p.species AND s.type = 'ADD_ON'
SET p.status = 'INACTIVE'
WHERE p.name = '車資';

ALTER TABLE products
  DROP COLUMN allow_fractional_quantity;