ALTER TABLE appointments
  DROP FOREIGN KEY fk_appointments_staff;

ALTER TABLE appointments
  DROP COLUMN staff_id;
