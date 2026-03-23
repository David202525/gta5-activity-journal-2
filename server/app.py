from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, random, urllib.request, urllib.parse, hashlib
from datetime import datetime, date

app = Flask(__name__)
CORS(app)

DATA_FILE   = "/opt/hud_data/db.json"
ORDERS_FILE = "/opt/hud_data/orders.json"

VK_TOKEN        = os.environ.get("VK_BOT_TOKEN", "")
VK_CONFIRM_CODE = os.environ.get("VK_CONFIRM_CODE", "")
VK_SECRET_KEY   = os.environ.get("VK_SECRET_KEY", "")

DEFAULT_DATA = {"users": [
    {"id": 1, "username": "BlackStar_IX", "password": "curator123",
     "rank": "IV", "title": "Командующий", "role": "curator",
     "status": "offline", "level": 87, "xp": 8700, "xpMax": 10000,
     "reputation": 9850, "onlineToday": 0, "onlineWeek": 0,
     "warnings": 0, "penalties": [], "weekActivity": [0,0,0,0,0,0,0],
     "vk_id": None}
]}

# ── DB helpers ────────────────────────────────────────────────

def read_db():
    if not os.path.exists(DATA_FILE):
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        write_db(DEFAULT_DATA)
        return DEFAULT_DATA
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_db(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def read_orders():
    if not os.path.exists(ORDERS_FILE):
        return []
    with open(ORDERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_orders(orders):
    os.makedirs(os.path.dirname(ORDERS_FILE), exist_ok=True)
    with open(ORDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(orders, f, ensure_ascii=False, indent=2)

def public_user(u):
    return {k: v for k, v in u.items() if k != "password"}

# ── Users ─────────────────────────────────────────────────────

@app.route("/api/users", methods=["GET"])
def get_users():
    return jsonify({"users": [public_user(u) for u in read_db()["users"]]})

@app.route("/api/login", methods=["POST"])
def login():
    body = request.get_json() or {}
    db = read_db()
    user = next((u for u in db["users"]
                 if u["username"] == body.get("username","").strip()
                 and u["password"] == body.get("password","")), None)
    if not user:
        return jsonify({"error": "Неверный ник или пароль"}), 401
    return jsonify({"user": public_user(user)})

@app.route("/api/users/<int:user_id>/status", methods=["POST"])
def set_status(user_id):
    body = request.get_json() or {}
    status = body.get("status", "offline")
    db = read_db()
    today_str = date.today().isoformat()
    for u in db["users"]:
        if u["id"] == user_id:
            prev = u.get("status", "offline")
            # Считаем минуты сессии
            if prev == "online" and u.get("session_start"):
                try:
                    start = datetime.fromisoformat(u["session_start"])
                    elapsed = int((datetime.utcnow() - start).total_seconds() / 60)
                    if elapsed > 0:
                        if u.get("last_online_date") != today_str:
                            u["onlineToday"] = 0
                        u["onlineToday"] = u.get("onlineToday", 0) + elapsed
                        u["onlineWeek"]  = u.get("onlineWeek", 0) + elapsed
                        wa = u.get("weekActivity", [0]*7)
                        if len(wa) < 7: wa = wa + [0]*(7-len(wa))
                        wa[date.today().weekday()] += elapsed
                        u["weekActivity"] = wa
                except Exception:
                    pass
            u["status"] = status
            u["last_online_date"] = today_str
            u["session_start"] = datetime.utcnow().isoformat() if status == "online" else None
            break
    write_db(db)
    return jsonify({"ok": True})

@app.route("/api/users/<int:user_id>/online", methods=["POST"])
def add_online(user_id):
    body = request.get_json() or {}
    minutes = int(body.get("minutes", 1))
    day_idx = int(body.get("dayIdx", 0))
    today_str = date.today().isoformat()
    db = read_db()
    for u in db["users"]:
        if u["id"] == user_id:
            if u.get("last_online_date") != today_str:
                u["onlineToday"] = 0
            u["onlineToday"] = u.get("onlineToday", 0) + minutes
            u["onlineWeek"]  = u.get("onlineWeek", 0) + minutes
            wa = u.get("weekActivity", [0]*7)
            if len(wa) < 7: wa = wa + [0]*(7-len(wa))
            wa[day_idx] += minutes
            u["weekActivity"] = wa
            u["last_online_date"] = today_str
            break
    write_db(db)
    return jsonify({"ok": True})

@app.route("/api/users", methods=["POST"])
def add_user():
    body = request.get_json() or {}
    username = body.get("username","").strip()
    password = body.get("password","")
    if not username or not password:
        return jsonify({"error": "Ник и пароль обязательны"}), 400
    db = read_db()
    if any(u["username"] == username for u in db["users"]):
        return jsonify({"error": "Участник уже существует"}), 409
    new_id = max((u["id"] for u in db["users"]), default=0) + 1
    new_user = {
        "id": new_id, "username": username, "password": password,
        "rank": body.get("rank","I"), "title": body.get("title","Новобранец"),
        "role": body.get("role","user"), "status": "offline",
        "level": 1, "xp": 0, "xpMax": 1000, "reputation": 0,
        "onlineToday": 0, "onlineWeek": 0, "warnings": 0,
        "penalties": [], "weekActivity": [0,0,0,0,0,0,0], "vk_id": None
    }
    db["users"].append(new_user)
    write_db(db)
    return jsonify({"ok": True, "user": public_user(new_user)})

@app.route("/api/users/<int:user_id>", methods=["PATCH"])
def edit_user(user_id):
    body = request.get_json() or {}
    allowed = {"username","password","rank","title","role","level","xp","xpMax",
               "reputation","warnings","penalties","status","onlineToday",
               "onlineWeek","weekActivity","vk_id","vk_photo"}
    db = read_db()
    for u in db["users"]:
        if u["id"] == user_id:
            for k, v in body.items():
                if k in allowed:
                    u[k] = v
            break
    write_db(db)
    return jsonify({"ok": True})

@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    db = read_db()
    db["users"] = [u for u in db["users"] if u["id"] != user_id]
    write_db(db)
    return jsonify({"ok": True})

# ── Orders ────────────────────────────────────────────────────

@app.route("/api/orders", methods=["GET"])
def get_orders():
    return jsonify({"orders": read_orders()})

@app.route("/api/orders", methods=["POST"])
def add_order():
    order = request.get_json() or {}
    orders = read_orders()
    orders.append(order)
    write_orders(orders)
    return jsonify({"ok": True})

@app.route("/api/orders/<int:order_id>", methods=["DELETE"])
def delete_order(order_id):
    orders = [o for o in read_orders() if o.get("id") != order_id]
    write_orders(orders)
    return jsonify({"ok": True})

# ── VK Bot ────────────────────────────────────────────────────

KEYBOARD_STATUS = json.dumps({
    "one_time": False,
    "buttons": [[
        {"action": {"type": "text", "label": "!онлайн",  "payload": "{\"cmd\":\"online\"}"},  "color": "positive"},
        {"action": {"type": "text", "label": "!афк",     "payload": "{\"cmd\":\"afk\"}"},     "color": "secondary"},
        {"action": {"type": "text", "label": "!вышел",   "payload": "{\"cmd\":\"offline\"}"}, "color": "negative"},
    ]]
})

KEYBOARD_WHO = json.dumps({
    "one_time": False,
    "buttons": [[
        {"action": {"type": "text", "label": "!кто", "payload": "{\"cmd\":\"who\"}"}, "color": "primary"},
    ]]
})

STATUS_LABELS = {"online": "в сети 🟢", "afk": "АФК 🟡", "offline": "вышел 🔴"}


def vk_send(peer_id, text, keyboard=None):
    params = {
        "peer_id": peer_id,
        "message": text,
        "random_id": random.randint(0, 2**31),
        "access_token": VK_TOKEN,
        "v": "5.131",
    }
    if keyboard:
        params["keyboard"] = keyboard
    url = "https://api.vk.com/method/messages.send?" + urllib.parse.urlencode(params)
    try:
        urllib.request.urlopen(url)
    except Exception as e:
        print(f"VK send error: {e}")


def vk_get_user_info(vk_id):
    """Получаем имя и фото пользователя из VK."""
    params = {
        "user_ids": vk_id,
        "fields": "photo_200",
        "access_token": VK_TOKEN,
        "v": "5.131",
    }
    url = "https://api.vk.com/method/users.get?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url) as r:
            data = json.loads(r.read())
            users = data.get("response", [])
            if users:
                u = users[0]
                name = f"{u.get('first_name','')} {u.get('last_name','')}".strip()
                photo = u.get("photo_200", "")
                return name, photo
    except Exception:
        pass
    return None, None


def do_set_status(user_id, status):
    """Меняем статус игрока напрямую без test_request_context."""
    today_str = date.today().isoformat()
    db = read_db()
    for u in db["users"]:
        if u["id"] == user_id:
            prev = u.get("status", "offline")
            if prev == "online" and u.get("session_start"):
                try:
                    start = datetime.fromisoformat(u["session_start"])
                    elapsed = int((datetime.utcnow() - start).total_seconds() / 60)
                    if elapsed > 0:
                        if u.get("last_online_date") != today_str:
                            u["onlineToday"] = 0
                        u["onlineToday"] = u.get("onlineToday", 0) + elapsed
                        u["onlineWeek"]  = u.get("onlineWeek", 0) + elapsed
                        wa = u.get("weekActivity", [0]*7)
                        if len(wa) < 7: wa += [0]*(7-len(wa))
                        wa[date.today().weekday()] += elapsed
                        u["weekActivity"] = wa
                except Exception:
                    pass
            u["status"] = status
            u["last_online_date"] = today_str
            u["session_start"] = datetime.utcnow().isoformat() if status == "online" else None
            break
    write_db(db)


def get_online_list():
    db = read_db()
    lines = []
    for u in db["users"]:
        if u["status"] in ("online", "afk"):
            icon = "🟢" if u["status"] == "online" else "🟡"
            lines.append(f"{icon} {u['username']} [{u.get('title','')}]")
    return lines


@app.route("/api/vk", methods=["POST"])
def vk_webhook():
    body = request.get_json() or {}

    if body.get("secret") and body.get("secret") != VK_SECRET_KEY:
        return "forbidden", 403

    # Подтверждение сервера
    if body.get("type") == "confirmation":
        return VK_CONFIRM_CODE, 200

    event_type = body.get("type")

    # Новый участник вошёл в беседу
    if event_type == "chat_invite_user":
        obj     = body.get("object", {})
        peer_id = obj.get("peer_id") or obj.get("chat_id", 0) + 2000000000
        vk_id   = obj.get("user_id") or obj.get("from_id")
        if vk_id and vk_id > 0:
            db = read_db()
            already = any(u.get("vk_id") == vk_id for u in db["users"])
            if not already:
                vk_send(peer_id,
                    f"👋 Привет! Нажми кнопку !кто чтобы привязать свой аккаунт к журналу.",
                    KEYBOARD_WHO)
        return "ok", 200

    if event_type != "message_new":
        return "ok", 200

    msg     = body.get("object", {}).get("message", {})
    text    = msg.get("text", "").strip().lower()
    peer_id = msg.get("peer_id")
    vk_id   = msg.get("from_id")

    # Команда !кто — привязка аккаунта
    if text in ("!кто", "кто", "!who"):
        db = read_db()
        # Ищем пользователя с таким vk_id
        already = next((u for u in db["users"] if u.get("vk_id") == vk_id), None)
        if already:
            vk_send(peer_id,
                f"✅ Ты уже привязан как {already['username']}.\nИспользуй кнопки для смены статуса.",
                KEYBOARD_STATUS)
            return "ok", 200

        # Получаем имя и фото из VK
        vk_name, vk_photo = vk_get_user_info(vk_id)

        # Ищем пользователя по имени VK или создаём запись с vk_id
        matched = None
        if vk_name:
            for u in db["users"]:
                if u["username"].lower() == vk_name.lower():
                    matched = u
                    break

        if matched:
            matched["vk_id"] = vk_id
            if vk_photo:
                matched["vk_photo"] = vk_photo
            write_db(db)
            vk_send(peer_id,
                f"✅ Аккаунт привязан автоматически!\nТы — {matched['username']}.\nТеперь используй кнопки:",
                KEYBOARD_STATUS)
        else:
            # Не нашли — сообщаем ID для ручной привязки куратором
            vk_send(peer_id,
                f"🔗 Твой VK ID: {vk_id}\n"
                f"{'Имя: ' + vk_name if vk_name else ''}\n"
                f"Сообщи куратору этот ID — он привяжет тебя к журналу.\n"
                f"После привязки нажми !кто снова.",
                KEYBOARD_WHO)
        return "ok", 200

    # Команды статуса
    cmd = None
    if text in ("!онлайн", "онлайн", "!online"):   cmd = "online"
    elif text in ("!афк", "афк", "!afk"):           cmd = "afk"
    elif text in ("!вышел", "вышел", "!offline"):   cmd = "offline"

    if cmd is None:
        # Проверяем привязан ли пользователь
        db = read_db()
        linked = any(u.get("vk_id") == vk_id for u in db["users"])
        if linked:
            vk_send(peer_id, "Используй кнопки для смены статуса:", KEYBOARD_STATUS)
        else:
            vk_send(peer_id, "Сначала привяжи аккаунт:", KEYBOARD_WHO)
        return "ok", 200

    # Ищем игрока по vk_id
    db = read_db()
    player = next((u for u in db["users"] if u.get("vk_id") == vk_id), None)
    if not player:
        vk_send(peer_id,
            f"❌ Аккаунт не привязан. Нажми !кто для привязки.",
            KEYBOARD_WHO)
        return "ok", 200

    # Меняем статус
    do_set_status(player["id"], cmd)

    # Список онлайн
    online_lines = get_online_list()
    reply = (
        f"⚠️ {player['username']} {STATUS_LABELS[cmd]}.\n"
        f"На сервере:\n" + ("\n".join(online_lines) if online_lines else "никого нет")
    )
    vk_send(peer_id, reply, KEYBOARD_STATUS)
    return "ok", 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)