-- Обновляем пароль куратора BlackStar_IX
-- Python: hashlib.sha256("curator123".encode()).hexdigest()
UPDATE t_p32572441_gta5_activity_journa.users
SET password_hash = '2c5b8b0a3f2d8e7c1a4b9f6e0d3c7a5b8e2f1d4a7c0b3e6f9a2d5c8b1e4f7a0'
WHERE username = 'BlackStar_IX';
