"""
Организации: CRUD для фракций/организаций.
GET / — список всех организаций
POST / action=create — создать
POST / action=update — обновить
POST / action=delete — удалить
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
    'Access-Control-Max-Age': '86400',
}

SCHEMA = 't_p32572441_gta5_activity_journa'
CURATOR_ROLES = ('curator', 'curator_admin', 'curator_faction')
WRITE_ROLES   = ('curator', 'curator_admin', 'curator_faction', 'leader', 'admin')


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


def row_to_org(r):
    org_ranks = r[6] if r[6] else []
    if isinstance(org_ranks, str): org_ranks = json.loads(org_ranks)
    member_ranks = r[7] if r[7] else {}
    if isinstance(member_ranks, str): member_ranks = json.loads(member_ranks)
    return {
        'id': r[0], 'name': r[1], 'tag': r[2],
        'description': r[3] or '',
        'leaderId': r[4], 'leaderName': r[5] or '—',
        'orgRanks': org_ranks, 'memberRanks': member_ranks,
        'createdAt': r[8].isoformat() if r[8] else '',
        'memberIds': r[9] if r[9] else [],
        'curatorId': r[10],
        'dailyNorm': r[11] if r[11] is not None else 60,
        'weeklyNorm': r[12] if r[12] is not None else 300,
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

    caller_id, caller_role = caller

    # ── GET — список организаций ─────────────────────────────────
    if method == 'GET':
        cur.execute(
            f"SELECT id, name, tag, description, leader_id, leader_name, "
            f"org_ranks, member_ranks, created_at, member_ids, curator_id, daily_norm, weekly_norm "
            f"FROM {SCHEMA}.organizations ORDER BY id ASC"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'orgs': [row_to_org(r) for r in rows]})}

    body = {}
    if method in ('POST', 'PATCH', 'DELETE'):
        try:
            raw  = event.get('body') or ''
            body = json.loads(raw) if raw.strip() else {}
        except Exception:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверный формат'})}

    action = body.get('action', '')

    # ── POST action=create ────────────────────────────────────────
    if method == 'POST' and action == 'create':
        if caller_role not in CURATOR_ROLES:
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
        name        = str(body.get('name', '')).strip()[:64]
        tag         = str(body.get('tag', '')).strip()[:16]
        description = str(body.get('description', '')).strip()[:512]
        leader_id   = body.get('leaderId') or None
        leader_name = str(body.get('leaderName', '—')).strip()[:64]
        curator_id  = body.get('curatorId') or None
        daily_norm  = min(int(body.get('dailyNorm', 60)), 1440)
        weekly_norm = min(int(body.get('weeklyNorm', 300)), 10080)
        if not name or not tag:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Название и тег обязательны'})}
        cur.execute(
            f"INSERT INTO {SCHEMA}.organizations "
            f"(name, tag, description, leader_id, leader_name, curator_id, daily_norm, weekly_norm) "
            f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at",
            (name, tag, description, leader_id, leader_name, curator_id, daily_norm, weekly_norm)
        )
        new_id, created_at = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'ok': True, 'org': {
                    'id': new_id, 'name': name, 'tag': tag,
                    'description': description, 'leaderId': leader_id, 'leaderName': leader_name,
                    'orgRanks': [], 'memberRanks': {}, 'memberIds': [],
                    'createdAt': created_at.isoformat(),
                    'curatorId': curator_id, 'dailyNorm': daily_norm, 'weeklyNorm': weekly_norm,
                }})}

    # ── POST action=update / PATCH ────────────────────────────────
    if (method == 'POST' and action == 'update') or method == 'PATCH':
        if caller_role not in WRITE_ROLES:
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
        org_id = body.get('id') or (int(path.rstrip('/').split('/')[-1]) if path.rstrip('/').split('/')[-1].isdigit() else None)
        if not org_id:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не указан id'})}

        allowed_str  = ('name', 'tag', 'description', 'leader_name')
        allowed_int  = ('leader_id', 'curator_id', 'daily_norm', 'weekly_norm')
        allowed_json = ('org_ranks', 'member_ranks', 'member_ids')
        FIELD_MAP = {
            'name': 'name', 'tag': 'tag', 'description': 'description',
            'leaderName': 'leader_name', 'leaderId': 'leader_id',
            'curatorId': 'curator_id', 'dailyNorm': 'daily_norm',
            'weeklyNorm': 'weekly_norm', 'orgRanks': 'org_ranks',
            'memberRanks': 'member_ranks', 'memberIds': 'member_ids',
        }
        set_parts, vals = [], []
        for camel, snake in FIELD_MAP.items():
            if camel not in body: continue
            v = body[camel]
            if snake in allowed_str:
                set_parts.append(f"{snake} = %s"); vals.append(str(v)[:512])
            elif snake in allowed_int:
                set_parts.append(f"{snake} = %s"); vals.append(int(v) if v is not None else None)
            elif snake in allowed_json:
                raw_json = json.dumps(v)
                if len(raw_json) > 100000:
                    cur.close(); conn.close()
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Данные слишком большие'})}
                set_parts.append(f"{snake} = %s::jsonb"); vals.append(raw_json)
        if not set_parts:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет полей'})}
        vals.append(org_id)
        cur.execute(f"UPDATE {SCHEMA}.organizations SET {', '.join(set_parts)} WHERE id = %s", vals)
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    # ── POST action=delete / DELETE ───────────────────────────────
    if (method == 'POST' and action == 'delete') or method == 'DELETE':
        if caller_role not in CURATOR_ROLES:
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
        org_id = body.get('id') or (int(path.rstrip('/').split('/')[-1]) if path.rstrip('/').split('/')[-1].isdigit() else None)
        if not org_id:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не указан id'})}
        cur.execute(f"DELETE FROM {SCHEMA}.organizations WHERE id = %s", (int(org_id),))
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close(); conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}
