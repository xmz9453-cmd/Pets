UPDATE shops
SET public_entry_code = NULL;

ALTER TABLE shops
  MODIFY COLUMN public_entry_code CHAR(16) NULL;

UPDATE shops
SET public_entry_code = LOWER(HEX(RANDOM_BYTES(8)))
WHERE public_entry_code IS NULL;
