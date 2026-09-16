ALTER TABLE order_items
  ADD COLUMN pet_id INT NULL AFTER product_id,
  ADD CONSTRAINT fk_order_items_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
  ADD INDEX idx_order_items_pet_id (pet_id);
