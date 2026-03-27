"""
Таблицы Excel-стиля: GET /tables, PATCH /tables/org, PATCH /tables/admin
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
    'Access-Control-Max-Age': '86400',
}

SCHEMA = 't_p32572441_gta5_activity_journa'
WRITE_ROLES = ('curator', 'curator_admin', 'curator_faction', 'leader', 'admin')
MAX_JSON_SIZE = 500_000  # 500 KB


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


def row_to_sheet(r):
    cols = r[4] if r[4] else []
    rows = r[5] if r[5] else []
    if isinstance(cols, str): cols = json.loads(cols)
    if isinstance(rows, str): rows = json.loads(rows)
    return {'id': r[0], 'scope': r[1], 'orgId': r[2], 'name': r[3], 'columns': cols, 'rows': rows}


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

    caller_id, caller_role = caller

    # ── GET /tables — обе таблицы ────────────────────────────────
    if method == 'GET':
        cur.execute(
            f"SELECT id, scope, org_id, name, columns, rows FROM {SCHEMA}.table_sheets WHERE scope IN ('org','admin')"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        result = {'org': None, 'admin': None}
        for r in rows:
            sheet = row_to_sheet(r)
            if r[1] == 'org':   result['org']   = sheet
            elif r[1] == 'admin': result['admin'] = sheet
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(result)}

    # ── PATCH /tables/org или /tables/admin ───────────────────────
    if method in ('PATCH', 'POST'):
        if caller_role not in WRITE_ROLES:
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}

        try:
            raw  = event.get('body') or ''
            body = json.loads(raw) if raw.strip() else {}
        except Exception:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверный формат'})}

        if len(raw) > MAX_JSON_SIZE:
            cur.close(); conn.close()
            return {'statusCode': 413, 'headers': CORS, 'body': json.dumps({'error': 'Данные слишком большие'})}

        parts = path.rstrip('/').split('/')
        scope = parts[-1] if parts[-1] in ('org', 'admin') else body.get('scope', 'org')
        if scope not in ('org', 'admin'):
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверный scope'})}

        # Ограничение: admin таблицу могут менять только куратор_админа или куратор
        if scope == 'admin' and caller_role not in ('curator', 'curator_admin'):
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав на admin таблицу'})}

        name    = str(body.get('name', 'Таблица'))[:64]
        columns = body.get('columns', [])
        trows   = body.get('rows', [])
        org_id  = body.get('orgId') or None

        cols_json = json.dumps(columns)
        rows_json = json.dumps(trows)

        cur.execute(f"SELECT id FROM {SCHEMA}.table_sheets WHERE scope = %s", (scope,))
        existing = cur.fetchone()
        if existing:
            cur.execute(
                f"UPDATE {SCHEMA}.table_sheets SET name=%s, columns=%s::jsonb, rows=%s::jsonb, updated_at=NOW() WHERE scope=%s",
                (name, cols_json, rows_json, scope)
            )
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.table_sheets (scope, org_id, name, columns, rows) VALUES (%s, %s, %s, %s::jsonb, %s::jsonb)",
                (scope, org_id, name, cols_json, rows_json)
            )
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close(); conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}
