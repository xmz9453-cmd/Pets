ALTER TABLE order_items
  ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT '件' AFTER name;

UPDATE order_items oi
LEFT JOIN services s ON s.id = oi.service_id AND s.shop_id = oi.shop_id
LEFT JOIN products p ON p.id = oi.product_id AND p.shop_id = oi.shop_id
SET oi.unit = COALESCE(s.unit, p.unit, '件');