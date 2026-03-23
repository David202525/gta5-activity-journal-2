ALTER TABLE t_p32572441_gta5_activity_journa.organizations
  ADD COLUMN IF NOT EXISTS curator_id integer NULL,
  ADD COLUMN IF NOT EXISTS daily_norm integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS weekly_norm integer NOT NULL DEFAULT 300;

ALTER TABLE t_p32572441_gta5_activity_journa.users
  ADD COLUMN IF NOT EXISTS org_id integer NULL;
