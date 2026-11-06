CREATE TABLE portal_settings (
  id TINYINT UNSIGNED NOT NULL,
  footer_text VARCHAR(300) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_portal_settings_singleton CHECK (id = 1)
);

INSERT INTO portal_settings (id, footer_text)
VALUES (1, '© 2026 毛孩生活服務｜保留所有權利');
