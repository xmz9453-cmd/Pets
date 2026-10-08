CREATE TABLE IF NOT EXISTS booking_schedule_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  species ENUM('DOG', 'CAT') NOT NULL,
  start_time TIME NOT NULL,
  capacity INT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_booking_schedule_rules_capacity
    CHECK (
      (is_closed = TRUE AND capacity IS NULL)
      OR (is_closed = FALSE AND capacity > 0)
    ),
  UNIQUE KEY uq_booking_schedule_rules_species_start_time (species, start_time),
  INDEX idx_booking_schedule_rules_species_status_time (species, status, start_time)
);

CREATE TABLE IF NOT EXISTS booking_schedule_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  override_date DATE NOT NULL,
  species ENUM('DOG', 'CAT') NOT NULL,
  start_time TIME NULL,
  start_time_scope TINYINT GENERATED ALWAYS AS (start_time IS NULL) STORED,
  start_time_key CHAR(8) GENERATED ALWAYS AS (
    CASE
      WHEN start_time IS NULL THEN '00:00:00'
      ELSE CAST(start_time AS CHAR(8))
    END
  ) STORED,
  is_closed BOOLEAN NOT NULL,
  capacity INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_booking_schedule_overrides_values
    CHECK (
      (start_time IS NULL AND is_closed = TRUE AND capacity IS NULL)
      OR (
        start_time IS NOT NULL
        AND (
          (is_closed = TRUE AND capacity IS NULL)
          OR (is_closed = FALSE AND capacity > 0)
        )
      )
    ),
  UNIQUE KEY uq_booking_schedule_overrides_scope (
    override_date,
    species,
    start_time_scope,
    start_time_key
  ),
  INDEX idx_booking_schedule_overrides_date_species (override_date, species)
);
