"""
Таблицы Excel-стиля: GET /tables, PATCH /tables/org, PATCH /tables/admin
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
}

SCHEMA = 't_p32572441_gta5_activity_journa'


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def row_to_sheet(r):
    cols = r[4] if r[4] else []
    rows = r[5] if r[5] else []
    if isinstance(cols, str): cols = json.loads(cols)
    if isinstance(rows, str): rows = json.loads(rows)
    return {
        'id': r[0], 'scope': r[1], 'orgId': r[2],
        'name': r[3], 'columns': cols, 'rows': rows,
    }


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path   = event.get('path', '/')

    # ── GET /tables — обе таблицы ────────────────────────────────
    if method == 'GET':
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(
            f"SELECT id, scope, org_id, name, columns, rows FROM {SCHEMA}.table_sheets WHERE scope IN ('org','admin')"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        result = {'org': None, 'admin': None}
        for r in rows:
            sheet = row_to_sheet(r)
            if r[1] == 'org':
                result['org'] = sheet
            elif r[1] == 'admin':
                result['admin'] = sheet
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(result)}

    # ── PATCH /tables/org или /tables/admin ───────────────────────
    if method in ('PATCH', 'POST'):
        raw  = event.get('body') or ''
        body = json.loads(raw) if raw.strip() else {}

        # Определяем scope из пути или тела
        parts = path.rstrip('/').split('/')
        scope = parts[-1] if parts[-1] in ('org', 'admin') else body.get('scope', 'org')

        name    = body.get('name', 'Таблица')
        columns = body.get('columns', [])
        trows   = body.get('rows', [])
        org_id  = body.get('orgId') or None

        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.table_sheets WHERE scope = %s", (scope,))
        existing = cur.fetchone()
        if existing:
            cur.execute(
                f"UPDATE {SCHEMA}.table_sheets SET name=%s, columns=%s::jsonb, rows=%s::jsonb, updated_at=NOW() WHERE scope=%s",
                (name, json.dumps(columns), json.dumps(trows), scope)
            )
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.table_sheets (scope, org_id, name, columns, rows) VALUES (%s, %s, %s, %s::jsonb, %s::jsonb)",
                (scope, org_id, name, json.dumps(columns), json.dumps(trows))
            )
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}
