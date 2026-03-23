"""
ВК бот для управления статусом участников.
Кнопки: !онлайн (зелёная), !афк (серая), !вышел (красная).
При нажатии — меняет статус игрока в БД и отправляет сообщение в беседу.
"""
import json
import os
import psycopg2
import urllib.request
import urllib.parse

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

SCHEMA = 't_p32572441_gta5_activity_journa'

# Цвета кнопок VK
BTN_GREEN = "positive"
BTN_RED   = "negative"
BTN_GREY  = "secondary"

KEYBOARD = json.dumps({
    "one_time": False,
    "buttons": [
        [
            {"action": {"type": "text", "label": "!онлайн", "payload": "{\"cmd\":\"online\"}"}, "color": BTN_GREEN},
            {"action": {"type": "text", "label": "!афк",    "payload": "{\"cmd\":\"afk\"}"},    "color": BTN_GREY},
            {"action": {"type": "text", "label": "!вышел",  "payload": "{\"cmd\":\"offline\"}"}, "color": BTN_RED},
        ]
    ]
})

STATUS_LABELS = {
    "online":  "в сети 🟢",
    "afk":     "АФК 🟡",
    "offline": "вышел 🔴",
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def vk_api(method: str, params: dict) -> dict:
    token = os.environ.get('VK_BOT_TOKEN', '')
    params['access_token'] = token
    params['v'] = '5.131'
    query = urllib.parse.urlencode(params)
    url = f"https://api.vk.com/method/{method}?{query}"
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


def send_message(peer_id: int, text: str, keyboard: str = None):
    import random
    params = {
        'peer_id': peer_id,
        'message': text,
        'random_id': random.randint(0, 2**31),
    }
    if keyboard:
        params['keyboard'] = keyboard
    vk_api('messages.send', params)


def get_player_by_vk(vk_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, username, role, status FROM {SCHEMA}.users WHERE vk_id = %s",
        (vk_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row


def set_player_status(user_id: int, status: str):
    from datetime import datetime, date, timezone
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        f"SELECT status, session_start, last_online_date, online_today, online_week, week_activity "
        f"FROM {SCHEMA}.users WHERE id = %s", (user_id,)
    )
    row = cur.fetchone()
    if row:
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

        if minutes_to_add > 0 and week_activity:
            day_idx = today.weekday()
            week_activity[day_idx] = (week_activity[day_idx] or 0) + minutes_to_add

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


def get_online_list():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT username, title, status FROM {SCHEMA}.users WHERE status IN ('online','afk') ORDER BY status"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    raw = event.get('body') or ''
    try:
        body = json.loads(raw) if raw.strip() else {}
    except Exception:
        return {'statusCode': 200, 'headers': CORS, 'body': 'ok'}

    # Подтверждение сервера VK
    if body.get('type') == 'confirmation':
        confirm = os.environ.get('VK_CONFIRM_CODE', '')
        return {'statusCode': 200, 'headers': CORS, 'body': confirm}

    if body.get('type') != 'message_new':
        return {'statusCode': 200, 'headers': CORS, 'body': 'ok'}

    msg     = body.get('object', {}).get('message', {})
    text    = msg.get('text', '').strip().lower()
    peer_id = msg.get('peer_id')
    vk_id   = msg.get('from_id')

    # Определяем команду
    cmd = None
    if text in ('!онлайн', '!онлайн', 'онлайн', '!online'):
        cmd = 'online'
    elif text in ('!афк', 'афк', '!afk'):
        cmd = 'afk'
    elif text in ('!вышел', 'вышел', '!offline', '!выход'):
        cmd = 'offline'

    if cmd is None:
        # Показываем клавиатуру на любое сообщение
        send_message(peer_id,
            "Используй кнопки ниже для смены статуса:",
            KEYBOARD
        )
        return {'statusCode': 200, 'headers': CORS, 'body': 'ok'}

    # Ищем игрока по vk_id
    player = get_player_by_vk(vk_id)
    if not player:
        send_message(peer_id,
            f"❌ Твой ВК аккаунт не привязан к журналу.\n"
            f"Попроси куратора привязать твой VK ID: {vk_id}",
            KEYBOARD
        )
        return {'statusCode': 200, 'headers': CORS, 'body': 'ok'}

    player_id, username, role, cur_status = player

    # Меняем статус
    set_player_status(player_id, cmd)

    # Список онлайн для сообщения
    online_rows = get_online_list()
    online_lines = []
    for uname, title, st in online_rows:
        icon = "🟢" if st == "online" else "🟡"
        online_lines.append(f"{icon} {uname} [{title}]")

    status_text = STATUS_LABELS[cmd]
    online_str = "\n".join(online_lines) if online_lines else "никого нет"

    reply = (
        f"⚠️ {username} {status_text}.\n"
        f"На сервере:\n{online_str}"
    )
    send_message(peer_id, reply, KEYBOARD)

    return {'statusCode': 200, 'headers': CORS, 'body': 'ok'}
