"""
Управление приказами: получение списка, создание, удаление.
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
}

SCHEMA = 't_p32572441_gta5_activity_journa'


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def row_to_order(r):
    return {
        'id': r[0],
        'number': r[1],
        'targetName': r[2],
        'comment': r[3],
        'issuedBy': r[4],
        'issuedByRole': r[5],
        'issuedAt': r[6].isoformat() if r[6] else None,
        'valid': r[7],
        'validationError': r[8],
    }


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    # ── GET /orders — список всех приказов ──────────────────────
    if method == 'GET':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, number, target_name, comment, issued_by, issued_by_role, issued_at, valid, validation_error "
            f"FROM {SCHEMA}.orders ORDER BY issued_at ASC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'orders': [row_to_order(r) for r in rows]})}

    # ── POST /orders — создать приказ ────────────────────────────
    if method == 'POST':
        raw = event.get('body') or ''
        body = json.loads(raw) if raw.strip() else {}

        number = body.get('number', '').strip()
        target_name = body.get('targetName', '').strip()
        comment = body.get('comment', '').strip()
        issued_by = body.get('issuedBy', '').strip()
        issued_by_role = body.get('issuedByRole', 'leader')
        valid = bool(body.get('valid', True))
        validation_error = body.get('validationError') or None

        if not number or not target_name or not issued_by:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Обязательные поля отсутствуют'})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.orders (number, target_name, comment, issued_by, issued_by_role, valid, validation_error) "
            f"VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (number, target_name, comment, issued_by, issued_by_role, valid, validation_error)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'id': new_id})}

    # ── DELETE /orders/{id} — удалить приказ ─────────────────────
    if method == 'DELETE':
        parts = path.rstrip('/').split('/')
        order_id = parts[-1] if parts else None
        if not order_id or not order_id.isdigit():
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не указан id приказа'})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.orders WHERE id = %s", (int(order_id),))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}