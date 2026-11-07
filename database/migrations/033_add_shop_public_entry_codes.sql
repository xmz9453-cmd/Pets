ALTER TABLE shops
  ADD COLUMN public_entry_code CHAR(32) NULL AFTER slug,
  ADD UNIQUE KEY uq_shops_public_entry_code (public_entry_code);
