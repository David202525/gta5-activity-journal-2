"""
Управление приказами: получение списка, создание, удаление.
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
    'Access-Control-Max-Age': '86400',
}

SCHEMA = 't_p32572441_gta5_activity_journa'
WRITE_ROLES  = ('curator', 'curator_admin', 'curator_faction', 'leader', 'admin')
DELETE_ROLES = ('curator', 'curator_admin', 'curator_faction', 'leader')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_token(event: dict) -> str:
    auth = event.get('headers', {}).get('X-Authorization') or event.get('headers', {}).get('Authorization') or ''
    return auth.replace('Bearer ', '').strip()


def verify_token(cur, token: str):
    if not token:
        return None
    cur.execute(f"SELECT id, role, username FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    return cur.fetchone()


def row_to_order(r):
    return {
        'id': r[0], 'number': r[1], 'targetName': r[2],
        'comment': r[3], 'issuedBy': r[4], 'issuedByRole': r[5],
        'issuedAt': r[6].isoformat() if r[6] else None,
        'valid': r[7], 'validationError': r[8],
    }


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path   = event.get('path', '/')
    token  = get_token(event)

    conn = get_conn()
    cur  = conn.cursor()
    caller = verify_token(cur, token)

    if not caller:
        cur.close(); conn.close()
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    caller_id, caller_role, caller_username = caller

    # ── GET /orders — список всех приказов ──────────────────────
    if method == 'GET':
        cur.execute(
            f"SELECT id, number, target_name, comment, issued_by, issued_by_role, issued_at, valid, validation_error "
            f"FROM {SCHEMA}.orders ORDER BY issued_at ASC"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'orders': [row_to_order(r) for r in rows]})}

    # ── POST /orders — создать приказ ────────────────────────────
    if method == 'POST':
        if caller_role not in WRITE_ROLES:
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
        try:
            raw  = event.get('body') or ''
            body = json.loads(raw) if raw.strip() else {}
        except Exception:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверный формат'})}

        number           = str(body.get('number', '')).strip()[:32]
        target_name      = str(body.get('targetName', '')).strip()[:64]
        comment          = str(body.get('comment', '')).strip()[:512]
        issued_by_role   = caller_role  # берём из токена, не из тела
        valid            = bool(body.get('valid', True))
        validation_error = body.get('validationError') or None

        if not number or not target_name:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Обязательные поля отсутствуют'})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.orders (number, target_name, comment, issued_by, issued_by_role, valid, validation_error) "
            f"VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (number, target_name, comment, caller_username, issued_by_role, valid, validation_error)
        )
        new_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'id': new_id})}

    # ── DELETE /orders/{id} — удалить приказ ─────────────────────
    if method == 'DELETE':
        if caller_role not in DELETE_ROLES:
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
        parts    = path.rstrip('/').split('/')
        order_id = parts[-1] if parts else None
        if not order_id or not order_id.isdigit():
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не указан id приказа'})}
        cur.execute(f"DELETE FROM {SCHEMA}.orders WHERE id = %s", (int(order_id),))
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close(); conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}
