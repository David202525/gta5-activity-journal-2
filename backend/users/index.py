"""
Управление пользователями: список, добавление, смена статуса, редактирование, взыскания, роли.
"""
import json
import os
import hashlib
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
    'Access-Control-Max-Age': '86400',
}

SCHEMA = 't_p32572441_gta5_activity_journa'
ALLOWED_ROLES = ('user', 'leader', 'deputy', 'admin', 'curator', 'curator_admin', 'curator_faction')

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_token(event: dict) -> str:
    auth = event.get('headers', {}).get('X-Authorization') or event.get('headers', {}).get('Authorization') or ''
    return auth.replace('Bearer ', '').strip()

def verify_token(cur, token: str):
    if not token:
        return None
    cur.execute(f"SELECT id, role FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    return cur.fetchone()

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
        'orgId': r[15],
    }

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token  = get_token(event)

    conn = get_conn()
    cur  = conn.cursor()
    caller = verify_token(cur, token)

    # ── GET: список всех пользователей (требует авторизации) ────
    if method == 'GET':
        if not caller:
            cur.close(); conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
        cur.execute(
            f"SELECT id, username, role, title, rank, level, xp, xp_max, reputation, "
            f"online_today, online_week, warnings, status, penalties, week_activity, org_id "
            f"FROM {SCHEMA}.users ORDER BY reputation DESC"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': [row_to_user(r) for r in rows]})}

    if method == 'POST':
        try:
            raw = event.get('body') or ''
            body = json.loads(raw) if raw.strip() else {}
        except Exception:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверный формат'})}

        action = body.get('action')

        # set_status не требует токена (вызывается из VK бота)
        if action == 'set_status':
            user_id = body.get('user_id')
            status  = body.get('status', 'offline')
            if status not in ('online', 'afk', 'offline'):
                status = 'offline'

            cur.execute(
                f"SELECT status, session_start, last_online_date, online_today, online_week, week_activity "
                f"FROM {SCHEMA}.users WHERE id = %s", (user_id,)
            )
            row = cur.fetchone()
            if row:
                from datetime import datetime, date, timezone
                prev_status, session_start, last_online_date, online_today, online_week, week_activity = row
                now   = datetime.now(timezone.utc)
                today = date.today()
                if last_online_date and last_online_date < today:
                    online_today = 0
                minutes_to_add = 0
                if prev_status == 'online' and session_start:
                    if session_start.tzinfo is None:
                        session_start = session_start.replace(tzinfo=timezone.utc)
                    elapsed = int((now - session_start).total_seconds() / 60)
                    if 0 < elapsed < 1440:
                        minutes_to_add = elapsed
                new_online_today = online_today + minutes_to_add
                new_online_week  = online_week  + minutes_to_add
                if minutes_to_add > 0 and week_activity:
                    day_idx = today.weekday()
                    week_activity[day_idx] = week_activity[day_idx] + minutes_to_add
                new_session_start = now if status == 'online' else None
                cur.execute(
                    f"""UPDATE {SCHEMA}.users
                        SET status=%s, last_seen=NOW(), session_start=%s,
                            online_today=%s, online_week=%s,
                            last_online_date=%s, week_activity=%s
                        WHERE id=%s""",
                    (status, new_session_start, new_online_today, new_online_week,
                     today, json.dumps(week_activity), user_id)
                )
                conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # Все остальные действия требуют авторизации
        if not caller:
            cur.close(); conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        caller_id, caller_role = caller
        is_curator = caller_role in ('curator', 'curator_admin', 'curator_faction')
        is_admin   = caller_role in ('admin', 'curator', 'curator_admin', 'curator_faction', 'leader')

        if action == 'add_user':
            if not is_curator:
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
            username   = str(body.get('username', '')).strip()[:32]
            password   = str(body.get('password', '')).strip()[:64]
            role       = body.get('role', 'user')
            title      = str(body.get('title', 'Новобранец')).strip()[:64]
            rank       = str(body.get('rank', '1')).strip()[:16]
            created_by = str(body.get('created_by', ''))[:64]
            if not username or not password:
                cur.close(); conn.close()
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Ник и пароль обязательны'})}
            if role not in ALLOWED_ROLES:
                role = 'user'
            pw_hash = hash_password(password)
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
                cur.close(); conn.close()
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Такой ник уже существует'})}
            finally:
                try: cur.close(); conn.close()
                except Exception: pass
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'id': new_id})}

        if action == 'edit_player':
            if not is_admin:
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
            user_id     = body.get('user_id')
            fields      = body.get('fields', {})
            allowed_text = ('username', 'rank', 'title', 'role')
            allowed_int  = ('warnings', 'vk_id', 'org_id')
            allowed_json = ('penalties',)
            set_parts, vals = [], []
            for k, v in fields.items():
                if k in allowed_text:
                    set_parts.append(f"{k} = %s"); vals.append(str(v)[:128])
                elif k in allowed_int:
                    set_parts.append(f"{k} = %s"); vals.append(int(v))
                elif k in allowed_json:
                    set_parts.append(f"{k} = %s::jsonb"); vals.append(json.dumps(v))
            if not set_parts or not user_id:
                cur.close(); conn.close()
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}
            vals.append(user_id)
            cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(set_parts)} WHERE id = %s", vals)
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'set_role':
            if not is_curator:
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
            user_id = body.get('user_id')
            role    = body.get('role', 'user')
            if role not in ALLOWED_ROLES: role = 'user'
            cur.execute(f"UPDATE {SCHEMA}.users SET role = %s WHERE id = %s", (role, user_id))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'set_penalties':
            if not is_admin:
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
            user_id   = body.get('user_id')
            penalties = body.get('penalties', [])
            if not isinstance(penalties, list) or len(json.dumps(penalties)) > 50000:
                cur.close(); conn.close()
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверные данные'})}
            cur.execute(f"UPDATE {SCHEMA}.users SET penalties = %s WHERE id = %s", (json.dumps(penalties), user_id))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action in ('add_warning', 'remove_warning'):
            if not is_admin:
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
            user_id = body.get('user_id')
            delta   = 1 if action == 'add_warning' else -1
            cur.execute(f"UPDATE {SCHEMA}.users SET warnings = GREATEST(0, warnings + %s) WHERE id = %s", (delta, user_id))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'add_online':
            user_id  = body.get('user_id')
            minutes  = min(int(body.get('minutes', 0)), 1440)
            day_idx  = max(0, min(6, int(body.get('dayIdx', 0))))
            cur.execute(
                f"SELECT online_today, online_week, week_activity FROM {SCHEMA}.users WHERE id = %s", (user_id,)
            )
            row = cur.fetchone()
            if row:
                ot, ow, wa = row
                wa = wa if wa else [0]*7
                wa[day_idx] = wa[day_idx] + minutes
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET online_today=%s, online_week=%s, week_activity=%s WHERE id=%s",
                    (ot + minutes, ow + minutes, json.dumps(wa), user_id)
                )
                conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'delete_player':
            if caller_role not in ('curator', 'curator_admin', 'curator_faction'):
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
            user_id = body.get('user_id')
            cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id = %s", (int(user_id),))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        cur.close(); conn.close()
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неизвестный action'})}

    if method == 'DELETE':
        if not caller:
            cur.close(); conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
        if caller[1] not in ('curator', 'curator_admin', 'curator_faction'):
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет прав'})}
        try:
            raw  = event.get('body') or ''
            body = json.loads(raw) if raw.strip() else {}
            user_id = int(body.get('user_id', 0))
        except Exception:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет id'})}
        cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close(); conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}
