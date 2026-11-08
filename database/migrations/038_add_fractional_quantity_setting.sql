ALTER TABLE products
  ADD COLUMN allow_fractional_quantity BOOLEAN NOT NULL DEFAULT FALSE AFTER unit;

ALTER TABLE services
  ADD COLUMN allow_fractional_quantity BOOLEAN NOT NULL DEFAULT FALSE AFTER unit;