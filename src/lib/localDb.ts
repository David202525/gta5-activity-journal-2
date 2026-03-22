import { Player, MOCK_USERS } from "./types";

const DB_KEY = "hud_players_db";

export type StoredUser = Player & { password: string; token: string };

// ── Инициализация БД ─────────────────────────────────────────
function initDb(): StoredUser[] {
  return MOCK_USERS as StoredUser[];
}

// ── Чтение всех пользователей ────────────────────────────────
export function dbGetAll(): StoredUser[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const initial = initDb();
      localStorage.setItem(DB_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return initDb();
  }
}

// ── Сохранить всех ───────────────────────────────────────────
function dbSaveAll(users: StoredUser[]) {
  localStorage.setItem(DB_KEY, JSON.stringify(users));
}

// ── Логин ────────────────────────────────────────────────────
export function dbLogin(username: string, password: string): StoredUser | null {
  const users = dbGetAll();
  return users.find(u => u.username === username && u.password === password) ?? null;
}

// ── Получить игроков (без паролей) ───────────────────────────
export function dbGetPlayers(): Player[] {
  return dbGetAll().map(({ password: _p, token: _t, ...u }) => { void _p; void _t; return u; });
}

// ── Обновить статус ──────────────────────────────────────────
export function dbSetStatus(userId: number, status: Player["status"]) {
  const users = dbGetAll();
  dbSaveAll(users.map(u => u.id === userId ? { ...u, status } : u));
}

// ── Обновить онлайн (прибавить минуты) ───────────────────────
export function dbAddOnlineMinutes(userId: number, minutes: number) {
  const users = dbGetAll();
  dbSaveAll(users.map(u => {
    if (u.id !== userId) return u;
    const todayIdx = new Date().getDay(); // 0=Вс..6=Сб
    const weekIdx  = todayIdx === 0 ? 6 : todayIdx - 1; // Пн=0..Вс=6
    const activity = [...(u.weekActivity ?? [0,0,0,0,0,0,0])];
    activity[weekIdx] = (activity[weekIdx] ?? 0) + minutes;
    return {
      ...u,
      onlineToday: u.onlineToday + minutes,
      onlineWeek:  u.onlineWeek  + minutes,
      weekActivity: activity,
    };
  }));
}

// ── Редактировать поля игрока ────────────────────────────────
export function dbEditPlayer(userId: number, fields: Partial<StoredUser>) {
  const users = dbGetAll();
  dbSaveAll(users.map(u => u.id === userId ? { ...u, ...fields } : u));
}

// ── Добавить игрока ──────────────────────────────────────────
export function dbAddPlayer(data: {
  username: string; password: string; role: string;
  title: string; rank: string;
}): StoredUser {
  const users = dbGetAll();
  const newId = Math.max(0, ...users.map(u => u.id)) + 1;
  const newUser: StoredUser = {
    id: newId,
    username: data.username,
    password: data.password,
    token: `local-token-${newId}`,
    rank: data.rank,
    title: data.title,
    role: data.role as Player["role"],
    status: "offline",
    level: 1,
    xp: 0,
    xpMax: 1000,
    reputation: 0,
    onlineToday: 0,
    onlineWeek: 0,
    warnings: 0,
    penalties: [],
    weekActivity: [0, 0, 0, 0, 0, 0, 0],
  };
  dbSaveAll([...users, newUser]);
  return newUser;
}

// ── Сбросить онлайн-сегодня (раз в сутки) ───────────────────
export function dbResetDailyOnline() {
  const users = dbGetAll();
  dbSaveAll(users.map(u => ({ ...u, onlineToday: 0, status: "offline" as Player["status"] })));
}
