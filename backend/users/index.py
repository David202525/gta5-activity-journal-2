"""
Управление пользователями: список, добавление, смена статуса, редактирование, взыскания, роли.
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
ALLOWED_ROLES = ('user', 'leader', 'deputy', 'admin', 'curator', 'curator_admin', 'curator_faction')

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def row_to_user(r):
    penalties = r[13] if r[13] else []
    if isinstance(penalties, str):
        penalties = json.loads(penalties)
    week_activity = r[14] if r[14] else [0, 0, 0, 0, 0, 0, 0]
    return {
        'id': r[0], 'username': r[1], 'role': r[2],
        'title': r[3], 'rank': r[4], 'level': r[5],
        'xp': r[6], 'xpMax': r[7], 'reputation': r[8],
        'onlineToday': r[9], 'onlineWeek': r[10],
        'warnings': r[11], 'status': r[12],
        'penalties': penalties,
        'weekActivity': week_activity,
    }

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')

    # ── GET: список всех пользователей ──────────────────────────
    if method == 'GET':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, username, role, title, rank, level, xp, xp_max, reputation, "
            f"online_today, online_week, warnings, status, penalties, week_activity "
            f"FROM {SCHEMA}.users ORDER BY reputation DESC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': [row_to_user(r) for r in rows]})}

    if method == 'POST':
        raw = event.get('body') or ''
        body = json.loads(raw) if raw.strip() else {}
        action = body.get('action')

        # ── add_user ────────────────────────────────────────────
        if action == 'add_user':
            username = body.get('username', '').strip()
            password = body.get('password', '').strip()
            role = body.get('role', 'user')
            title = body.get('title', 'Новобранец').strip()
            rank = body.get('rank', '1').strip()
            created_by = body.get('created_by', '')

            if not username or not password:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Ник и пароль обязательны'})}
            if role not in ALLOWED_ROLES:
                role = 'user'

            pw_hash = hash_password(password)
            conn = get_conn()
            cur = conn.cursor()
            try:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.users (username, password_hash, role, title, rank, created_by) "
                    f"VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
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

        # ── edit_player ─────────────────────────────────────────
        if action == 'edit_player':
            user_id = body.get('user_id')
            fields = body.get('fields', {})
            allowed = ('username', 'rank', 'title')
            updates = {k: v for k, v in fields.items() if k in allowed}
            if not updates or not user_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}

            set_parts = ', '.join(f"{k} = %s" for k in updates)
            vals = list(updates.values()) + [user_id]
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.users SET {set_parts} WHERE id = %s", vals)
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── set_role ────────────────────────────────────────────
        if action == 'set_role':
            user_id = body.get('user_id')
            role = body.get('role', 'user')
            if role not in ALLOWED_ROLES:
                role = 'user'
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.users SET role = %s WHERE id = %s", (role, user_id))
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── set_penalties ───────────────────────────────────────
        if action == 'set_penalties':
            user_id = body.get('user_id')
            penalties = body.get('penalties', [])
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.users SET penalties = %s WHERE id = %s",
                        (json.dumps(penalties), user_id))
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── set_status ──────────────────────────────────────────
        if action == 'set_status':
            user_id = body.get('user_id')
            status = body.get('status', 'offline')
            if status not in ('online', 'afk', 'offline'):
                status = 'offline'

            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                f"SELECT status, session_start, last_online_date, online_today, online_week, week_activity "
                f"FROM {SCHEMA}.users WHERE id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            if row:
                from datetime import datetime, date, timezone
                prev_status, session_start, last_online_date, online_today, online_week, week_activity = row
                now = datetime.now(timezone.utc)
                today = date.today()

                if last_online_date and last_online_date < today:
                    online_today = 0

                minutes_to_add = 0
                if prev_status == 'online' and session_start:
                    if session_start.tzinfo is None:
                        session_start = session_start.replace(tzinfo=timezone.utc)
                    elapsed = int((now - session_start).total_seconds() / 60)
                    if elapsed > 0:
                        minutes_to_add = elapsed

                new_online_today = online_today + minutes_to_add
                new_online_week = online_week + minutes_to_add

                # Обновляем week_activity (индекс 0=Пн..6=Вс)
                if minutes_to_add > 0 and week_activity:
                    day_idx = today.weekday()
                    week_activity[day_idx] = week_activity[day_idx] + minutes_to_add

                new_session_start = now if status == 'online' else None

                cur.execute(
                    f"""UPDATE {SCHEMA}.users
                        SET status = %s, last_seen = NOW(),
                            session_start = %s,
                            online_today = %s,
                            online_week = %s,
                            last_online_date = %s,
                            week_activity = %s
                        WHERE id = %s""",
                    (status, new_session_start, new_online_today, new_online_week,
                     today, week_activity, user_id)
                )
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── add_warning / remove_warning ────────────────────────
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
