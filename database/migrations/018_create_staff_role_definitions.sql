INSERT INTO roles (code, name)
VALUES
  ('OWNER', 'Owner'),
  ('FRONT_DESK', 'Front Desk'),
  ('GROOMER', 'Groomer')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);
