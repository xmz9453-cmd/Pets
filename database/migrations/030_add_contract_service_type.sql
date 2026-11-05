ALTER TABLE contract_versions
  ADD COLUMN service_type ENUM('GENERAL', 'GROOMING', 'BOARDING') NOT NULL DEFAULT 'GENERAL' AFTER version_label,
  DROP INDEX uq_contract_versions_shop_current_slot,
  ADD UNIQUE KEY uq_contract_versions_shop_current_slot (shop_id, service_type, current_slot);