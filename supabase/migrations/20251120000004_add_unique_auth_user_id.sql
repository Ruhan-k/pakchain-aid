ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_user_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique
ON users(auth_user_id)
WHERE auth_user_id IS NOT NULL;

