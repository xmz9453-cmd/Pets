DELETE FROM portal_backgrounds;

DROP TABLE portal_settings;

ALTER TABLE portal_backgrounds
  DROP INDEX uq_portal_backgrounds_active_slot,
  ADD COLUMN shop_id INT NOT NULL AFTER id,
  ADD UNIQUE KEY uq_portal_backgrounds_shop_active_slot (shop_id, active_slot),
  ADD KEY idx_portal_backgrounds_shop_id (shop_id),
  ADD CONSTRAINT fk_portal_backgrounds_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

CREATE TABLE portal_settings (
  shop_id INT NOT NULL,
  footer_text VARCHAR(300) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (shop_id),
  CONSTRAINT fk_portal_settings_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

INSERT INTO portal_settings (shop_id, footer_text)
SELECT id, '' FROM shops;
