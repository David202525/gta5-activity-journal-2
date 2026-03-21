-- Устанавливаем правильный sha256 пароль "curator123" для BlackStar_IX
UPDATE t_p32572441_gta5_activity_journa.users
SET password_hash = 'd74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1'
WHERE username = 'BlackStar_IX';
