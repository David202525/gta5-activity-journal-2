ALTER TABLE t_p32572441_gta5_activity_journa.users
ADD COLUMN IF NOT EXISTS session_token character varying(64) NULL;

CREATE INDEX IF NOT EXISTS idx_users_session_token
ON t_p32572441_gta5_activity_journa.users(session_token)
WHERE session_token IS NOT NULL;
