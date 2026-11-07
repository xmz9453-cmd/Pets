ALTER TABLE auth_sessions
  ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL AFTER created_at,
  ADD KEY idx_auth_sessions_expiry_last_seen (expires_at, last_seen_at);
