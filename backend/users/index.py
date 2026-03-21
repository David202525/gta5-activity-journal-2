"""
Управление пользователями: список всех, добавление нового, смена статуса.
Добавлять пользователей могут лидер, администратор и куратор.
"""
import json
import os
import hashlib
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

SCHEMA = 't_p32572441_gta5_activity_journa'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method == 'GET':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, username, role, title, rank, level, xp, xp_max, reputation, online_today, online_week, warnings, status FROM {SCHEMA}.users ORDER BY reputation DESC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        users = []
        for r in rows:
            users.append({
                'id': r[0], 'username': r[1], 'role': r[2],
                'title': r[3], 'rank': r[4], 'level': r[5],
                'xp': r[6], 'xpMax': r[7], 'reputation': r[8],
                'onlineToday': r[9], 'onlineWeek': r[10],
                'warnings': r[11], 'status': r[12],
            })
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': users})}

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action')

        if action == 'add_user':
            username = body.get('username', '').strip()
            password = body.get('password', '').strip()
            role = body.get('role', 'user')
            title = body.get('title', 'Новобранец').strip()
            rank = body.get('rank', 'I').strip()
            created_by = body.get('created_by', '')

            if not username or not password:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Ник и пароль обязательны'})}

            if role not in ('user', 'leader', 'admin', 'curator'):
                role = 'user'

            pw_hash = hash_password(password)

            conn = get_conn()
            cur = conn.cursor()
            try:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.users (username, password_hash, role, title, rank, created_by) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (username, pw_hash, role, title, rank, created_by)
                )
                new_id = cur.fetchone()[0]
                conn.commit()
            except psycopg2.errors.UniqueViolation:
                conn.rollback()
                cur.close()
                conn.close()
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Такой ник уже существует'})}
            finally:
                cur.close()
                conn.close()

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'id': new_id})}

        if action == 'set_status':
            user_id = body.get('user_id')
            status = body.get('status', 'offline')
            if status not in ('online', 'afk', 'offline'):
                status = 'offline'

            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.users SET status = %s, last_seen = NOW() WHERE id = %s",
                (status, user_id)
            )
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'add_warning':
            user_id = body.get('user_id')
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.users SET warnings = warnings + 1 WHERE id = %s", (user_id,))
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'remove_warning':
            user_id = body.get('user_id')
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.users SET warnings = GREATEST(warnings - 1, 0) WHERE id = %s", (user_id,))
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Bad request'})}
