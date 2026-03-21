
CREATE TABLE t_p32572441_gta5_activity_journa.users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'leader', 'admin', 'curator')),
  title VARCHAR(64) NOT NULL DEFAULT 'Новобранец',
  rank VARCHAR(8) NOT NULL DEFAULT 'I',
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  xp_max INTEGER NOT NULL DEFAULT 1000,
  reputation INTEGER NOT NULL DEFAULT 0,
  online_today INTEGER NOT NULL DEFAULT 0,
  online_week INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'afk', 'offline')),
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(64)
);

-- Seed: куратор по умолчанию (пароль: curator123)
INSERT INTO t_p32572441_gta5_activity_journa.users
  (username, password_hash, role, title, rank, level, xp, xp_max, reputation)
VALUES
  ('BlackStar_IX', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGTolH2Dg5Q9OIEULXy4zE3wkJO', 'curator', 'Командующий', 'IV', 87, 8700, 10000, 9850);
