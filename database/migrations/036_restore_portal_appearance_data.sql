INSERT INTO portal_settings (shop_id, footer_text)
SELECT shop_id, footer_text
FROM portal_appearance_migration_settings
ON DUPLICATE KEY UPDATE footer_text = VALUES(footer_text);

INSERT INTO portal_backgrounds
  (shop_id, storage_key, original_filename, mime_type, file_size, is_active, created_by, created_at)
SELECT shop_id, storage_key, original_filename, mime_type, file_size, is_active, created_by, created_at
FROM portal_appearance_migration_backgrounds
ON DUPLICATE KEY UPDATE
  shop_id = VALUES(shop_id),
  original_filename = VALUES(original_filename),
  mime_type = VALUES(mime_type),
  file_size = VALUES(file_size),
  is_active = VALUES(is_active),
  created_by = VALUES(created_by),
  created_at = VALUES(created_at);

DROP TABLE portal_appearance_migration_backgrounds;
DROP TABLE portal_appearance_migration_settings;
