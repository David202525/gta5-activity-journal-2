"""
Авторизация пользователя по нику и паролю.
Возвращает данные профиля и токен сессии.
"""
import json
import os
import hashlib
import secrets
import time
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

SCHEMA = 't_p32572441_gta5_activity_journa'

# Rate limiting: ip -> [timestamp, ...]
_rate_cache: dict = {}
MAX_ATTEMPTS = 10
WINDOW_SEC   = 60

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    hits = [t for t in _rate_cache.get(ip, []) if now - t < WINDOW_SEC]
    _rate_cache[ip] = hits
    if len(hits) >= MAX_ATTEMPTS:
        return False
    _rate_cache[ip].append(now)
    return True

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', 'unknown')

    raw = event.get('body') or ''
    try:
        body = json.loads(raw) if raw.strip() else {}
    except Exception:
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверный формат запроса'})}

    action = body.get('action')

    if action == 'login':
        if not check_rate_limit(ip):
            return {'statusCode': 429, 'headers': CORS, 'body': json.dumps({'error': 'Слишком много попыток. Подождите минуту'})}

        username = str(body.get('username', '')).strip()[:64]
        password = str(body.get('password', '')).strip()[:128]

        if not username or not password:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Введите ник и пароль'})}

        pw_hash = hash_password(password)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, username, role, title, rank, level, xp, xp_max, reputation, online_today, online_week, warnings, status, org_id FROM {SCHEMA}.users WHERE username = %s AND password_hash = %s",
            (username, pw_hash)
        )
        row = cur.fetchone()

        if not row:
            cur.close()
            conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный ник или пароль'})}

        token = secrets.token_hex(32)
        cur.execute(
            f"UPDATE {SCHEMA}.users SET status = 'online', last_seen = NOW(), session_start = NOW(), session_token = %s WHERE id = %s",
            (token, row[0])
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
            'orgId': row[13],
            'token': token,
        }
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': user})}

    if action == 'fix_password':
        username    = str(body.get('username', '')).strip()[:64]
        new_password = str(body.get('new_password', '')).strip()[:128]
        secret = body.get('secret', '')
        setup_secret = os.environ.get('SETUP_SECRET', '')
        if not setup_secret or secret != setup_secret:
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Forbidden'})}
        if not username or not new_password:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не указан ник или пароль'})}
        pw_hash = hash_password(new_password)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE username = %s", (pw_hash, username))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неизвестный action'})}
