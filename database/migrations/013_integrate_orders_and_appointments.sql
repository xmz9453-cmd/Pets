ALTER TABLE orders
  ADD COLUMN source_type ENUM('WALK_IN', 'APPOINTMENT') NOT NULL DEFAULT 'WALK_IN' AFTER customer_id,
  ADD COLUMN appointment_id INT NULL AFTER source_type,
  ADD CONSTRAINT fk_orders_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
  ADD INDEX idx_orders_appointment_id (appointment_id);

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_source_context CHECK (
    (source_type = 'WALK_IN' AND appointment_id IS NULL)
    OR (source_type = 'APPOINTMENT' AND appointment_id IS NOT NULL)
  );