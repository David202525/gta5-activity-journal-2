from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, random, urllib.request, urllib.parse, hashlib
from datetime import datetime, date

app = Flask(__name__)
CORS(app)

DATA_FILE    = "/opt/hud_data/db.json"
ORDERS_FILE  = "/opt/hud_data/orders.json"
PENDING_FILE = "/opt/hud_data/pending_bind.json"
ORGS_FILE    = "/opt/hud_data/orgs.json"
TABLES_FILE  = "/opt/hud_data/tables.json"

VK_TOKEN        = os.environ.get("VK_BOT_TOKEN", "")
VK_CONFIRM_CODE = os.environ.get("VK_CONFIRM_CODE", "64bc1464")
VK_SECRET_KEY   = os.environ.get("VK_SECRET_KEY", "aaQ13axAPQEcczQa")

# ID бесед (peer_id). Устанавливаются через /api/settings
SETTINGS_FILE = "/opt/hud_data/settings.json"

def read_settings():
    if not os.path.exists(SETTINGS_FILE):
        return {"chat_admin": None, "extra_chats": []}
    with open(SETTINGS_FILE, "r") as f:
        s = json.load(f)
    if "extra_chats" not in s:
        s["extra_chats"] = []
    s.pop("chat_faction", None)
    return s

def write_settings(s):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(s, f)

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

def read_orgs():
    if not os.path.exists(ORGS_FILE):
        return []
    with open(ORGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_orgs(orgs):
    os.makedirs(os.path.dirname(ORGS_FILE), exist_ok=True)
    with open(ORGS_FILE, "w", encoding="utf-8") as f:
        json.dump(orgs, f, ensure_ascii=False, indent=2)

def read_tables():
    if not os.path.exists(TABLES_FILE):
        return {"org": None, "admin": None}
    with open(TABLES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_tables(tables):
    os.makedirs(os.path.dirname(TABLES_FILE), exist_ok=True)
    with open(TABLES_FILE, "w", encoding="utf-8") as f:
        json.dump(tables, f, ensure_ascii=False, indent=2)

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
            # Сброс недельной статистики если началась новая неделя
            last_date_str = u.get("last_online_date")
            if last_date_str:
                from datetime import timedelta
                last_date = date.fromisoformat(last_date_str)
                last_monday = last_date - timedelta(days=last_date.weekday())
                this_monday = date.today() - timedelta(days=date.today().weekday())
                if this_monday > last_monday:
                    u["weekActivity"] = [0]*7
                    u["onlineWeek"] = 0
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
            # Сброс недельной статистики если началась новая неделя
            last_date_str = u.get("last_online_date")
            if last_date_str:
                from datetime import timedelta
                last_date = date.fromisoformat(last_date_str)
                last_monday = last_date - timedelta(days=last_date.weekday())
                this_monday = date.today() - timedelta(days=date.today().weekday())
                if this_monday > last_monday:
                    u["weekActivity"] = [0]*7
                    u["onlineWeek"] = 0
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
               "onlineWeek","weekActivity","vk_id","vk_photo","orgId"}
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

# ── Organizations ─────────────────────────────────────────────

@app.route("/api/orgs", methods=["GET"])
def get_orgs():
    return jsonify({"orgs": read_orgs()})

@app.route("/api/orgs", methods=["POST"])
def create_org():
    org = request.get_json() or {}
    orgs = read_orgs()
    new_id = max((o["id"] for o in orgs), default=0) + 1
    org["id"] = new_id
    if "memberIds"   not in org: org["memberIds"]   = []
    if "orgRanks"    not in org: org["orgRanks"]    = []
    if "memberRanks" not in org: org["memberRanks"] = {}
    orgs.append(org)
    write_orgs(orgs)
    return jsonify({"ok": True, "org": org})

@app.route("/api/orgs/<int:org_id>", methods=["PATCH"])
def update_org(org_id):
    body = request.get_json() or {}
    orgs = read_orgs()
    for i, o in enumerate(orgs):
        if o["id"] == org_id:
            orgs[i] = {**o, **body, "id": org_id}
            break
    write_orgs(orgs)
    return jsonify({"ok": True})

@app.route("/api/orgs/<int:org_id>", methods=["DELETE"])
def delete_org(org_id):
    orgs = [o for o in read_orgs() if o["id"] != org_id]
    write_orgs(orgs)
    return jsonify({"ok": True})

# ── Tables ────────────────────────────────────────────────────

@app.route("/api/tables", methods=["GET"])
def get_tables():
    return jsonify(read_tables())

@app.route("/api/tables/<scope>", methods=["PATCH"])
def update_table(scope):
    if scope not in ("org", "admin"):
        return jsonify({"error": "invalid scope"}), 400
    body = request.get_json() or {}
    tables = read_tables()
    tables[scope] = body
    write_tables(tables)
    return jsonify({"ok": True})

# ── Settings ──────────────────────────────────────────────────
@app.route("/api/settings", methods=["GET"])
def get_settings():
    return jsonify(read_settings())

def vk_join_chat(invite_link):
    """Бот вступает в беседу по ссылке-приглашению и возвращает chat_id (peer_id)."""
    # Извлекаем хэш из ссылки вида https://vk.me/join/HASH или https://vk.com/invite/HASH
    import re
    m = re.search(r'vk\.me/join/([^/?#]+)|vk\.com/invite/([^/?#]+)', invite_link)
    if not m:
        return None
    link_hash = m.group(1) or m.group(2)
    params = urllib.parse.urlencode({
        "link": f"https://vk.me/join/{link_hash}",
        "access_token": VK_TOKEN,
        "v": "5.131",
    })
    url = "https://api.vk.com/method/messages.joinChatByInviteLink?" + params
    try:
        with urllib.request.urlopen(url) as resp:
            data = json.loads(resp.read().decode())
        chat_id = data.get("response", {}).get("chat_id")
        if chat_id:
            return 2000000000 + int(chat_id)
    except Exception as e:
        print(f"VK join chat error: {e}")
    return None

def resolve_peer_id(value):
    """Если value — ссылка vk.me/join/..., вступаем и возвращаем peer_id. Иначе пробуем int."""
    if value is None:
        return None
    if isinstance(value, int):
        return value
    s = str(value).strip()
    if s.isdigit():
        return int(s)
    if "vk.me/join/" in s or "vk.com/invite/" in s:
        return vk_join_chat(s)
    # ссылка вида vk.com/im?sel=cNNN
    import re
    m = re.search(r'[?&]sel=c(\d+)', s)
    if m:
        return 2000000000 + int(m.group(1))
    return None

@app.route("/api/settings", methods=["PATCH"])
def update_settings():
    body = request.get_json() or {}
    s = read_settings()
    if "chat_admin" in body:
        s["chat_admin"] = resolve_peer_id(body["chat_admin"])
    if "extra_chats" in body and isinstance(body["extra_chats"], list):
        s["extra_chats"] = [
            {"id": str(resolve_peer_id(c.get("id", "")) or ""), "label": str(c.get("label", ""))[:64]}
            for c in body["extra_chats"] if isinstance(c, dict)
        ][:20]
    write_settings(s)
    return jsonify({"ok": True, "settings": s})

# ── Notify VK on status change from site ─────────────────────
@app.route("/api/users/<int:user_id>/notify-vk", methods=["POST"])
def notify_vk_status(user_id):
    body = request.get_json() or {}
    status = body.get("status", "offline")
    db = read_db()
    player = next((u for u in db["users"] if u["id"] == user_id), None)
    if not player:
        return jsonify({"ok": False, "reason": "not found"})

    # Отправляем только в беседу — личные сообщения не трогаем
    broadcast_status(player, status)
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
BOT_NAME = "Журнал активности"


def vk_send(peer_id, text, keyboard=None):
    params = {
        "peer_id": peer_id,
        "message": text,
        "random_id": random.randint(0, 2**31),
        "access_token": VK_TOKEN,
        "v": "5.131",
    }
    if keyboard is not None:
        params["keyboard"] = keyboard
    url = "https://api.vk.com/method/messages.send?" + urllib.parse.urlencode(params)
    try:
        urllib.request.urlopen(url)
    except Exception as e:
        print(f"VK send error: {e}")

def vk_delete_message(peer_id, msg_id):
    """Удаляем сообщение пользователя в беседе."""
    params = {
        "peer_id": peer_id,
        "cmids": msg_id,
        "delete_for_all": 1,
        "access_token": VK_TOKEN,
        "v": "5.131",
    }
    url = "https://api.vk.com/method/messages.delete?" + urllib.parse.urlencode(params)
    try:
        urllib.request.urlopen(url)
    except Exception as e:
        print(f"VK delete error: {e}")


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
            # Сброс недельной статистики если началась новая неделя
            last_date_str = u.get("last_online_date")
            if last_date_str:
                from datetime import timedelta
                last_date = date.fromisoformat(last_date_str)
                last_monday = last_date - timedelta(days=last_date.weekday())
                this_monday = date.today() - timedelta(days=date.today().weekday())
                if this_monday > last_monday:
                    u["weekActivity"] = [0]*7
                    u["onlineWeek"] = 0
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


def read_pending():
    if not os.path.exists(PENDING_FILE):
        return {}
    with open(PENDING_FILE, "r") as f:
        return json.load(f)

def write_pending(data):
    os.makedirs(os.path.dirname(PENDING_FILE), exist_ok=True)
    with open(PENDING_FILE, "w") as f:
        json.dump(data, f)

FACTION_ROLES_SET = {"user", "leader", "deputy"}
ADMIN_ROLES_SET   = {"admin", "curator", "curator_admin", "curator_faction"}

def get_all_chat_ids():
    """Собираем все настроенные peer_id бесед."""
    settings = read_settings()
    ids = []
    if settings.get("chat_admin"):
        ids.append(settings["chat_admin"])
    for c in settings.get("extra_chats", []):
        cid = c.get("id", "")
        if cid and str(cid).isdigit():
            ids.append(int(cid))
    return ids

def broadcast_status(player, cmd):
    """Отправляем уведомление о статусе во все настроенные беседы."""
    status_text = STATUS_LABELS.get(cmd, cmd)
    lines = get_online_list()
    reply = f"⚠️ {player['username']} {status_text}.\nНа сервере:\n" + ("\n".join(lines) if lines else "никого нет")
    for chat_id in get_all_chat_ids():
        vk_send(chat_id, reply, KEYBOARD_STATUS)



ADMIN_ROLES    = {"admin", "curator", "curator_admin", "curator_faction"}
FACTION_ROLES  = {"user", "leader", "deputy"}

def can_see_user(viewer_role, target_role):
    """Определяет, видит ли viewer пользователя с target_role."""
    if viewer_role == "curator":
        return True  # куратор видит всех
    if viewer_role == "curator_admin":
        return target_role in {"admin", "curator", "curator_admin", "curator_faction"}
    if viewer_role == "curator_faction":
        return target_role in {"user", "leader", "deputy", "curator_faction", "curator"}
    if viewer_role == "admin":
        return target_role in {"admin", "curator", "curator_admin", "curator_faction"}
    # leader, deputy, user — видят только свою фракционную группу
    return target_role in FACTION_ROLES

def get_online_list(viewer_role=None):
    db = read_db()
    lines = []
    for u in db["users"]:
        if u["status"] not in ("online", "afk"):
            continue
        if viewer_role and not can_see_user(viewer_role, u.get("role", "user")):
            continue
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

    # Новый участник вошёл в беседу — сразу показываем кнопку !кто
    if event_type in ("chat_invite_user", "chat_invite_user_by_link"):
        obj     = body.get("object", {})
        peer_id = obj.get("peer_id") or obj.get("chat_id", 0) + 2000000000
        vk_id   = obj.get("user_id") or obj.get("from_id")

        bot_vk_id = obj.get("member_id") or 0
        if bot_vk_id < 0 and peer_id:
            s = read_settings()
            if not s.get("chat_admin"):
                s["chat_admin"] = peer_id
                write_settings(s)
                vk_send(peer_id, f"✅ Бот подключён к этой беседе как БЕСЕДА АДМИНОВ.\npeer_id = {peer_id}\n\nВставь это число в панели сайта в поле «БЕСЕДА АДМИНОВ».")
            else:
                extra = s.get("extra_chats", [])
                extra.append({"id": str(peer_id), "label": f"Беседа {len(extra)+1}"})
                s["extra_chats"] = extra
                write_settings(s)
                vk_send(peer_id, f"✅ Бот подключён к этой беседе.\npeer_id = {peer_id}\n\nОн добавлен как дополнительная беседа.")
            return "ok", 200

        if vk_id and vk_id > 0:
            db = read_db()
            already = any(u.get("vk_id") == vk_id for u in db["users"])
            if already:
                player = next(u for u in db["users"] if u.get("vk_id") == vk_id)
                vk_send(vk_id,
                    f"👋 С возвращением, {player['username']}! Используй кнопки:",
                    KEYBOARD_STATUS)
            else:
                vk_send(vk_id,
                    f"👋 Привет! Нажми кнопку ниже чтобы привязать аккаунт к журналу:",
                    KEYBOARD_WHO)
        return "ok", 200

    if event_type != "message_new":
        return "ok", 200

    msg      = body.get("object", {}).get("message", {})
    msg_id   = msg.get("conversation_message_id") or msg.get("id")
    raw_text = msg.get("text", "").strip()
    import re
    # Убираем упоминание группы: [club123|текст] или @club123 в любом месте строки
    raw_text = re.sub(r'\[club\d+\|[^\]]*\]\s*', '', raw_text).strip()
    raw_text = re.sub(r'@club\d+\s*', '', raw_text).strip()
    # Также убираем упоминания пользователей [id123|Имя]
    raw_text = re.sub(r'\[id\d+\|[^\]]*\]\s*', '', raw_text).strip()
    text     = raw_text.lower().strip()
    peer_id  = msg.get("peer_id")
    vk_id    = msg.get("from_id")

    # Команда !peer_id — узнать peer_id беседы
    if text in ("!peer_id", "peer_id", "!пиринг", "!id"):
        vk_send(peer_id, f"📌 peer_id этой беседы: {peer_id}\n\nВставь это число в панели сайта в нужное поле беседы.")
        return "ok", 200

    # Команда !кто — начало привязки
    if text in ("!кто", "кто", "!who", "начать", "start", "привязать"):
        db = read_db()
        already = next((u for u in db["users"] if u.get("vk_id") == vk_id), None)
        if already:
            vk_send(peer_id,
                f"✅ [id{vk_id}|{already['username']}] уже привязан [{already.get('title','')}].\nИспользуй кнопки для смены статуса.",
                KEYBOARD_STATUS)
            return "ok", 200

        # Запоминаем что этот vk_id ждёт ввода ника
        pending = read_pending()
        pending[str(vk_id)] = {"peer_id": peer_id}
        write_pending(pending)

        vk_send(peer_id,
            f"[id{vk_id}|Привет!] ✍️ Напиши свой ник с сайта (точно как он указан в журнале):",
            None)
        return "ok", 200

    # Если пользователь в режиме ожидания — пробуем привязать по нику
    pending = read_pending()
    if str(vk_id) in pending:
        db = read_db()
        saved = pending[str(vk_id)]
        reply_peer = saved["peer_id"] if isinstance(saved, dict) else peer_id

        # Ищем по нику (без учёта регистра)
        target = next((u for u in db["users"]
                       if u["username"].lower() == raw_text.lower()), None)

        if not target:
            vk_send(reply_peer,
                f"[id{vk_id}|❌] Ник «{raw_text}» не найден в журнале. Проверь написание и попробуй снова:",
                None)
            return "ok", 200

        if target.get("vk_id"):
            vk_send(reply_peer,
                f"[id{vk_id}|❌] Аккаунт {target['username']} уже привязан к другому VK.",
                KEYBOARD_WHO)
            del pending[str(vk_id)]
            write_pending(pending)
            return "ok", 200

        # Привязываем
        target["vk_id"] = vk_id
        _, vk_photo = vk_get_user_info(vk_id)
        if vk_photo:
            target["vk_photo"] = vk_photo
        write_db(db)

        # Удаляем из ожидания
        del pending[str(vk_id)]
        write_pending(pending)

        # Отвечаем в беседу
        vk_send(reply_peer,
            f"✅ [id{vk_id}|{target['username']}] привязан к журналу [{target.get('title','')}], Ранг {target.get('rank','')}.\n"
            f"Используй кнопки для смены статуса:",
            KEYBOARD_STATUS)
        return "ok", 200

    # Команды статуса
    cmd = None
    if text in ("!онлайн", "онлайн", "!online"):   cmd = "online"
    elif text in ("!афк", "афк", "!afk"):           cmd = "afk"
    elif text in ("!вышел", "вышел", "!offline"):   cmd = "offline"

    if cmd is None:
        db = read_db()
        pending = read_pending()
        linked = any(u.get("vk_id") == vk_id for u in db["users"])
        in_pending = str(vk_id) in pending
        if linked:
            vk_delete_message(peer_id, msg_id)
            vk_send(peer_id, "Используй кнопки для смены статуса:", KEYBOARD_STATUS)
        elif in_pending:
            pass
        else:
            vk_delete_message(peer_id, msg_id)
            vk_send(peer_id, "👋 Нажми кнопку ниже чтобы привязать аккаунт:", KEYBOARD_WHO)
        return "ok", 200

    # Ищем игрока по vk_id
    db = read_db()
    player = next((u for u in db["users"] if u.get("vk_id") == vk_id), None)
    if not player:
        vk_send(peer_id,
            f"[id{vk_id}|❌] Аккаунт не привязан. Напиши !кто для привязки.",
            KEYBOARD_WHO)
        return "ok", 200

    # Меняем статус
    do_set_status(player["id"], cmd)

    # Перечитываем актуальные данные после обновления
    db2 = read_db()
    player2 = next((u for u in db2["users"] if u["id"] == player["id"]), player)

    all_chats = get_all_chat_ids()
    if all_chats:
        broadcast_status(player2, cmd)
    else:
        status_text = STATUS_LABELS.get(cmd, cmd)
        lines = get_online_list()
        reply = f"⚠️ {player2['username']} {status_text}.\nНа сервере:\n" + ("\n".join(lines) if lines else "никого нет")
        vk_send(peer_id, reply, KEYBOARD_STATUS)

    return "ok", 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)