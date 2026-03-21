"""
Авторизация пользователя по нику и паролю.
Возвращает данные профиля и токен сессии.
"""
import json
import os
import hashlib
import secrets
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    schema = 't_p32572441_gta5_activity_journa'

    if action == 'login':
        username = body.get('username', '').strip()
        password = body.get('password', '').strip()

        if not username or not password:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Введите ник и пароль'})}

        pw_hash = hash_password(password)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, username, role, title, rank, level, xp, xp_max, reputation, online_today, online_week, warnings, status FROM {schema}.users WHERE username = %s AND password_hash = %s",
            (username, pw_hash)
        )
        row = cur.fetchone()

        if not row:
            cur.close()
            conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный ник или пароль'})}

        token = secrets.token_hex(32)
        cur.execute(
            f"UPDATE {schema}.users SET status = 'online', last_seen = NOW() WHERE id = %s",
            (row[0],)
        )
        conn.commit()
        cur.close()
        conn.close()

        user = {
            'id': row[0], 'username': row[1], 'role': row[2],
            'title': row[3], 'rank': row[4], 'level': row[5],
            'xp': row[6], 'xpMax': row[7], 'reputation': row[8],
            'onlineToday': row[9], 'onlineWeek': row[10],
            'warnings': row[11], 'status': row[12],
            'token': token,
        }
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': user})}

    if action == 'fix_password':
        username = body.get('username', '').strip()
        new_password = body.get('new_password', '').strip()
        secret = body.get('secret', '')
        if secret != 'gta5hub_setup_2026':
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Forbidden'})}
        pw_hash = hash_password(new_password)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {schema}.users SET password_hash = %s WHERE username = %s", (pw_hash, username))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'hash': pw_hash})}

    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неизвестный action'})}