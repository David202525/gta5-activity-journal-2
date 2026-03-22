-- V2__add_orders_and_table_sheets.sql
-- Приказы
CREATE TABLE IF NOT EXISTS t_p32572441_gta5_activity_journa.orders (
    id           SERIAL PRIMARY KEY,
    number       VARCHAR(16) NOT NULL,
    target_name  VARCHAR(64) NOT NULL,
    comment      TEXT NOT NULL DEFAULT '',
    issued_by    VARCHAR(64) NOT NULL,
    issued_by_role VARCHAR(32) NOT NULL DEFAULT 'leader',
    issued_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    valid        BOOLEAN NOT NULL DEFAULT TRUE,
    validation_error TEXT NULL
);

-- Листы таблиц (org/admin)
CREATE TABLE IF NOT EXISTS t_p32572441_gta5_activity_journa.table_sheets (
    id         SERIAL PRIMARY KEY,
    scope      VARCHAR(16) NOT NULL, -- 'org' | 'admin'
    org_id     INTEGER NULL,
    name       VARCHAR(64) NOT NULL DEFAULT 'Таблица',
    columns    JSONB NOT NULL DEFAULT '[]'::jsonb,
    rows       JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Разрешаем роль deputy в таблице users (убираем старое ограничение если было)
ALTER TABLE t_p32572441_gta5_activity_journa.users
    ALTER COLUMN role TYPE VARCHAR(32);
