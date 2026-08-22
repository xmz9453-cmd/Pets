ALTER TABLE services
  ADD COLUMN type ENUM('GROOMING', 'BOARDING') NOT NULL DEFAULT 'GROOMING' AFTER name,
  ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT '次' AFTER price,
  ADD COLUMN species ENUM('DOG', 'CAT', 'BOTH') NOT NULL DEFAULT 'BOTH' AFTER unit,
  ADD COLUMN duration_minutes INT NOT NULL DEFAULT 60 AFTER species,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER duration_minutes,
  ADD UNIQUE KEY uq_services_name (name);

UPDATE services
SET type = 'GROOMING',
    unit = '次',
    species = 'BOTH',
    duration_minutes = 60,
    sort_order = id,
    status = 'ACTIVE'
WHERE id IN (1, 2, 3, 4);