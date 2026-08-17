INSERT INTO foundation_verification (verification_key, verification_value)
VALUES ('foundation_seed', 'ready')
ON DUPLICATE KEY UPDATE
  verification_value = VALUES(verification_value),
  updated_at = CURRENT_TIMESTAMP;
