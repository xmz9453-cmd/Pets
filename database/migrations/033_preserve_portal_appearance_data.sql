CREATE TABLE IF NOT EXISTS portal_appearance_migration_settings (
  shop_id INT NOT NULL PRIMARY KEY,
  footer_text VARCHAR(300) NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_appearance_migration_backgrounds (
  storage_key VARCHAR(40) NOT NULL PRIMARY KEY,
  shop_id INT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(30) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL
);

SET @portal_settings_has_shop_id = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'portal_settings'
    AND column_name = 'shop_id'
);

SET @portal_settings_backup_sql = IF(
  @portal_settings_has_shop_id > 0,
  'INSERT INTO portal_appearance_migration_settings (shop_id, footer_text)
   SELECT shop_id, footer_text FROM portal_settings
   ON DUPLICATE KEY UPDATE footer_text = VALUES(footer_text)',
  'INSERT INTO portal_appearance_migration_settings (shop_id, footer_text)
   SELECT 1, footer_text FROM portal_settings WHERE id = 1
   ON DUPLICATE KEY UPDATE footer_text = VALUES(footer_text)'
);
PREPARE portal_settings_backup_statement FROM @portal_settings_backup_sql;
EXECUTE portal_settings_backup_statement;
DEALLOCATE PREPARE portal_settings_backup_statement;

SET @portal_backgrounds_has_shop_id = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'portal_backgrounds'
    AND column_name = 'shop_id'
);

SET @portal_backgrounds_backup_sql = IF(
  @portal_backgrounds_has_shop_id > 0,
  'INSERT INTO portal_appearance_migration_backgrounds
     (storage_key, shop_id, original_filename, mime_type, file_size, is_active, created_by, created_at)
   SELECT storage_key, shop_id, original_filename, mime_type, file_size, is_active, created_by, created_at
   FROM portal_backgrounds
   ON DUPLICATE KEY UPDATE
     shop_id = VALUES(shop_id),
     original_filename = VALUES(original_filename),
     mime_type = VALUES(mime_type),
     file_size = VALUES(file_size),
     is_active = VALUES(is_active),
     created_by = VALUES(created_by),
     created_at = VALUES(created_at)',
  'INSERT INTO portal_appearance_migration_backgrounds
     (storage_key, shop_id, original_filename, mime_type, file_size, is_active, created_by, created_at)
   SELECT storage_key, 1, original_filename, mime_type, file_size, is_active, created_by, created_at
   FROM portal_backgrounds
   ON DUPLICATE KEY UPDATE
     shop_id = VALUES(shop_id),
     original_filename = VALUES(original_filename),
     mime_type = VALUES(mime_type),
     file_size = VALUES(file_size),
     is_active = VALUES(is_active),
     created_by = VALUES(created_by),
     created_at = VALUES(created_at)'
);
PREPARE portal_backgrounds_backup_statement FROM @portal_backgrounds_backup_sql;
EXECUTE portal_backgrounds_backup_statement;
DEALLOCATE PREPARE portal_backgrounds_backup_statement;
