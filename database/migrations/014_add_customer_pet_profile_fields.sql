ALTER TABLE customers
  ADD COLUMN id_card_number VARCHAR(50) NULL AFTER line_id,
  ADD COLUMN emergency_contact_name VARCHAR(100) NULL AFTER id_card_number,
  ADD COLUMN emergency_contact_phone VARCHAR(30) NULL AFTER emergency_contact_name;

ALTER TABLE pets
  ADD COLUMN personality VARCHAR(500) NULL AFTER notes,
  ADD COLUMN medical_history TEXT NULL AFTER personality,
  ADD COLUMN other_history TEXT NULL AFTER medical_history;
