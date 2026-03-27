"""
Настройки проекта: беседы VK, дополнительные чаты.
GET /  — получить все настройки
PATCH / — обновить настройки
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
    'Access-Control-Max-Age': '86400',
}

SCHEMA = 't_p32572441_gta5_activity_journa'


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_token(event: dict) -> str:
    auth = event.get('headers', {}).get('X-Authorization') or event.get('headers', {}).get('Authorization') or ''
    return auth.replace('Bearer ', '').strip()


def verify_token(cur, token: str):
    if not token:
        return None
    cur.execute(f"SELECT id, role FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    return cur.fetchone()


def get_setting(cur, key: str, default=None):
    cur.execute(f"SELECT value FROM {SCHEMA}.settings WHERE key = %s", (key,))
    row = cur.fetchone()
    if not row:
        return default
    try:
        return json.loads(row[0])
    except Exception:
        return row[0]


def set_setting(cur, key: str, value):
    serialized = json.dumps(value) if not isinstance(value, str) else value
    cur.execute(
        f"INSERT INTO {SCHEMA}.settings (key, value) VALUES (%s, %s) "
        f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        (key, serialized)
    )


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token  = get_token(event)

    conn = get_conn()
    cur  = conn.cursor()
    caller = verify_token(cur, token)

    if not caller:
        cur.close(); conn.close()
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    # ── GET — вернуть все настройки ──────────────────────────────
    if method == 'GET':
        chat_faction = get_setting(cur, 'chat_faction', None)
        chat_admin   = get_setting(cur, 'chat_admin', None)
        extra_chats  = get_setting(cur, 'extra_chats', [])
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
            'chat_faction': chat_faction,
            'chat_admin':   chat_admin,
            'extra_chats':  extra_chats,
        })}

    # ── PATCH — сохранить настройки ──────────────────────────────
    if method == 'PATCH':
        if caller[1] not in ('curator', 'curator_admin', 'curator_faction'):
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}

        try:
            raw  = event.get('body') or ''
            body = json.loads(raw) if raw.strip() else {}
        except Exception:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверный формат'})}

        if 'chat_faction' in body:
            set_setting(cur, 'chat_faction', body['chat_faction'])
        if 'chat_admin' in body:
            set_setting(cur, 'chat_admin', body['chat_admin'])
        if 'extra_chats' in body:
            chats = body['extra_chats']
            if isinstance(chats, list) and len(chats) <= 20:
                safe = [{'id': str(c.get('id',''))[:20], 'label': str(c.get('label',''))[:64]} for c in chats if isinstance(c, dict)]
                set_setting(cur, 'extra_chats', safe)

        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close(); conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}
