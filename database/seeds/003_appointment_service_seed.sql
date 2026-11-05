INSERT INTO services (id, shop_id, name, type, description, price, unit, species, duration_minutes, sort_order, status)
VALUES
  (1, 1, 'Basic Grooming', 'GROOMING', 'Essential grooming package', 890.00, '次', 'BOTH', 60, 1, 'ACTIVE'),
  (2, 1, 'Bath & Dry', 'GROOMING', 'Bath and drying service', 450.00, '次', 'BOTH', 60, 2, 'ACTIVE'),
  (3, 1, 'Nail Trim', 'GROOMING', 'Nail clipping service', 180.00, '次', 'BOTH', 60, 3, 'ACTIVE'),
  (4, 1, 'Hair Styling', 'GROOMING', 'Style and finishing treatment', 650.00, '次', 'BOTH', 60, 4, 'ACTIVE')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
    type = VALUES(type),
  description = VALUES(description),
  price = VALUES(price),
    unit = VALUES(unit),
    species = VALUES(species),
    duration_minutes = VALUES(duration_minutes),
    sort_order = VALUES(sort_order),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
