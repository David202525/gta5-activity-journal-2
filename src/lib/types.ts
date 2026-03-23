export const API_AUTH = "https://functions.poehali.dev/0faae4ff-54b8-40f4-988a-aa6bbebd01f0";
export const API_USERS = "https://functions.poehali.dev/93e60fdd-bf88-468d-88c8-f312a5f61460";
export const API_ORDERS = "https://functions.poehali.dev/ec65c93f-9552-4d66-a9f5-4949602f6cf4";

export type Role = "user" | "leader" | "deputy" | "admin" | "curator" | "curator_admin" | "curator_faction";
export type Status = "online" | "afk" | "offline";
export type Tab = "stats" | "leaderboard" | "users" | "moderation" | "admin_panel" | "organizations" | "tables" | "orders";

// ── Таблицы (Excel-стиль) ─────────────────────────────────────
export const TABLE_COL_COLORS = [
  { value: "text-purple-300",  bg: "bg-purple-900/30",  label: "Фиолетовый" },
  { value: "text-sky-300",     bg: "bg-sky-900/30",     label: "Синий"      },
  { value: "text-emerald-300", bg: "bg-emerald-900/30", label: "Зелёный"    },
  { value: "text-amber-300",   bg: "bg-amber-900/30",   label: "Золотой"    },
  { value: "text-red-300",     bg: "bg-red-900/30",     label: "Красный"    },
  { value: "text-pink-300",    bg: "bg-pink-900/30",    label: "Розовый"    },
  { value: "text-zinc-300",    bg: "bg-zinc-900/30",    label: "Серый"      },
];

export interface TableColumn {
  id: number;
  name: string;
  color: string;  // из TABLE_COL_COLORS[].value
  width: number;  // px min-width
}

export interface TableRow {
  id: number;
  cells: Record<number, string>; // columnId → text
}

export interface TableSheet {
  id: number;
  name: string;       // "Состав", "Администрация" и т.д.
  scope: "org" | "admin"; // для какой области
  orgId?: number;     // если scope=org
  columns: TableColumn[];
  rows: TableRow[];
}

export const COL_ID_VERBAL   = 6; // id зарезервированного столбца "Устные предупреждения"
export const COL_ID_REPRIMAND = 7; // id зарезервированного столбца "Выговоры"

export const MOCK_TABLE_ORG: TableSheet = {
  id: 1, name: "Состав фракции", scope: "org", orgId: 1,
  columns: [
    { id: 1, name: "Никнейм",                color: "text-purple-300", width: 160 },
    { id: 2, name: "Должность",              color: "text-sky-300",    width: 140 },
    { id: 3, name: "Ранг",                   color: "text-amber-300",  width: 80  },
    { id: 4, name: "Онлайн",                 color: "text-emerald-300",width: 100 },
    { id: COL_ID_VERBAL,   name: "Уст. предупреждения", color: "text-yellow-300", width: 140 },
    { id: COL_ID_REPRIMAND, name: "Выговоры",           color: "text-red-300",    width: 100 },
    { id: 5, name: "Заметки",                color: "text-zinc-300",   width: 200 },
  ],
  rows: [
    { id: 1, cells: { 1: "Shadow_Wolf", 2: "Лидер",     3: "10", 4: "Высокий", [COL_ID_VERBAL]: "0", [COL_ID_REPRIMAND]: "0", 5: "" } },
    { id: 2, cells: { 1: "Ghost_Rider", 2: "Штурмовик", 3: "4",  4: "Средний", [COL_ID_VERBAL]: "0", [COL_ID_REPRIMAND]: "0", 5: "На испытательном" } },
  ],
};

export const MOCK_TABLE_ADMIN: TableSheet = {
  id: 2, name: "Администрация", scope: "admin",
  columns: [
    { id: 1, name: "Никнейм",               color: "text-purple-300", width: 160 },
    { id: 2, name: "Роль",                  color: "text-indigo-300", width: 140 },
    { id: 3, name: "Куратор",               color: "text-pink-300",   width: 140 },
    { id: 4, name: "Активность",            color: "text-emerald-300",width: 120 },
    { id: COL_ID_VERBAL,   name: "Уст. предупреждения", color: "text-yellow-300", width: 140 },
    { id: COL_ID_REPRIMAND, name: "Выговоры",           color: "text-red-300",    width: 100 },
    { id: 5, name: "Примечание",            color: "text-zinc-300",   width: 200 },
  ],
  rows: [
    { id: 1, cells: { 1: "Nexus_Prime",   2: "Администратор", 3: "BlackStar_IX", 4: "Высокая", [COL_ID_VERBAL]: "0", [COL_ID_REPRIMAND]: "0", 5: "" } },
    { id: 2, cells: { 1: "Curator_Admin", 2: "Кур. Адм.",     3: "BlackStar_IX", 4: "Высокая", [COL_ID_VERBAL]: "0", [COL_ID_REPRIMAND]: "0", 5: "" } },
    { id: 3, cells: { 1: "Curator_Frac",  2: "Кур. Фракций",  3: "BlackStar_IX", 4: "Средняя", [COL_ID_VERBAL]: "0", [COL_ID_REPRIMAND]: "0", 5: "" } },
  ],
};

// ── Приказы ───────────────────────────────────────────────────
export interface Order {
  id: number;
  number: string;        // номер приказа (вводит лидер)
  targetName: string;    // имя сотрудника
  comment: string;       // комментарий
  issuedBy: string;      // кто выдал (username)
  issuedByRole: Role;    // роль выдавшего
  issuedAt: string;      // дата ISO
  valid: boolean;        // прошёл ли проверку номера
  validationError?: string; // если невалидный — причина
}

// Тип взыскания
export type PenaltyType = "verbal" | "reprimand" | "excluded";

export interface Penalty {
  id: number;
  type: PenaltyType;
  reason: string;       // причина (например "Вышел с АФК без разрешения")
  issuedBy: string;     // кто выдал
  issuedAt: string;     // дата ISO
  isActive: boolean;    // снято или нет
}

// Ранг внутри организации (кастомный, создаётся лидером)
export interface OrgRank {
  id: number;
  name: string;   // название, например "Снайпер", "Разведчик"
  color: string;  // tailwind-цвет текста, например "text-sky-400"
}

export interface Organization {
  id: number;
  name: string;
  tag: string;
  description: string;
  leaderId: number | null;
  leaderName: string;
  curatorId?: number | null;
  dailyNorm?: number;              // дневная норма онлайна в минутах (для рядовых)
  weeklyNorm?: number;             // недельная норма онлайна в минутах
  memberIds: number[];
  orgRanks: OrgRank[];
  memberRanks: Record<number, number>;
  createdAt: string;
}

export const ORG_RANK_COLORS = [
  { value: "text-sky-400",    label: "Синий"    },
  { value: "text-emerald-400",label: "Зелёный"  },
  { value: "text-amber-400",  label: "Золотой"  },
  { value: "text-red-400",    label: "Красный"  },
  { value: "text-violet-400", label: "Фиолетовый" },
  { value: "text-pink-400",   label: "Розовый"  },
  { value: "text-zinc-400",   label: "Серый"    },
];

export const MOCK_ORGS: Organization[] = [
  {
    id: 1, name: "Shadow Legion", tag: "[SL]",
    description: "Элитное боевое подразделение",
    leaderId: 3, leaderName: "Shadow_Wolf",
    memberIds: [3, 4], createdAt: "2024-01-15",
    orgRanks: [
      { id: 1, name: "Снайпер",    color: "text-sky-400"     },
      { id: 2, name: "Штурмовик",  color: "text-red-400"     },
      { id: 3, name: "Разведчик",  color: "text-emerald-400" },
    ],
    memberRanks: { 4: 1 },
  },
  {
    id: 2, name: "Nexus Corp", tag: "[NC]",
    description: "Торговая корпорация Лос-Сантоса",
    leaderId: null, leaderName: "—",
    memberIds: [], createdAt: "2024-02-20",
    orgRanks: [], memberRanks: {},
  },
];

// Является ли роль куратором любого типа
export function isCuratorRole(role: Role): boolean {
  return role === "curator" || role === "curator_admin" || role === "curator_faction";
}

// Проверяет, может ли viewer редактировать target
export function canEditTarget(viewerRole: Role, targetRole: Role): boolean {
  if (viewerRole === "curator") return !isCuratorRole(targetRole);
  if (viewerRole === "curator_admin") return targetRole === "admin" || targetRole === "user";
  if (viewerRole === "curator_faction") return targetRole === "leader" || targetRole === "deputy" || targetRole === "user";
  if (viewerRole === "admin") return targetRole === "leader" || targetRole === "deputy" || targetRole === "user";
  if (viewerRole === "leader") return targetRole === "deputy" || targetRole === "user";
  if (viewerRole === "deputy") return targetRole === "user";
  return false;
}

// Причина предупреждения при смене статуса
export function statusChangePenaltyReason(fromStatus: Status, toStatus: Status): string {
  if (fromStatus === "afk"    && toStatus === "offline") return "Покинул АФК и вышел из игры без разрешения";
  if (fromStatus === "online" && toStatus === "offline") return "Вышел из игры без разрешения (был онлайн)";
  if (fromStatus === "online" && toStatus === "afk")     return "Ушёл в АФК без разрешения";
  return `Изменён статус: ${STATUS_LABELS[fromStatus]} → ${STATUS_LABELS[toStatus]}`;
}

// Подсчёт активных взысканий
export function countActivePenalties(penalties: Penalty[]): { verbal: number; reprimand: number } {
  const active = penalties.filter(p => p.isActive);
  return {
    verbal:    active.filter(p => p.type === "verbal").length,
    reprimand: active.filter(p => p.type === "reprimand").length,
  };
}

// Определяет тип следующего взыскания по кол-ву текущих
export function nextPenaltyType(penalties: Penalty[]): PenaltyType {
  const { verbal, reprimand } = countActivePenalties(penalties);
  if (reprimand >= 3) return "excluded";
  if (verbal >= 2)    return "reprimand";
  return "verbal";
}

// Выдаёт взыскание и обнуляет устные предупреждения при переходе к выговору
export function issuePenaltyToList(
  penalties: Penalty[],
  reason: string,
  issuedBy: string,
): { newPenalties: Penalty[]; type: PenaltyType; excluded: boolean } {
  const type = nextPenaltyType(penalties);

  // При выдаче выговора — снимаем все активные устные предупреждения
  const base = type === "reprimand"
    ? penalties.map(p => p.isActive && p.type === "verbal" ? { ...p, isActive: false } : p)
    : penalties;

  const newPenalty: Penalty = {
    id: Date.now(), type, reason, issuedBy,
    issuedAt: new Date().toISOString(), isActive: true,
  };

  return {
    newPenalties: [...base, newPenalty],
    type,
    excluded: type === "excluded",
  };
}

export interface Player {
  id: number;
  username: string;
  rank: string;
  title: string;
  role: Role;
  status: Status;
  level: number;
  xp: number;
  xpMax: number;
  reputation: number;
  onlineToday: number;
  onlineWeek: number;
  warnings: number;
  penalties: Penalty[];         // история взысканий
  weekActivity?: number[];      // минуты за каждый день недели [Пн..Вс]
  orgId?: number | null;        // id организации (если состоит)
}

export interface AuthUser extends Player { token: string; }

// Уведомление лидеру
export interface Notification {
  id: number;
  text: string;
  type: "warning" | "excluded" | "info";
  timestamp: string;
  read: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  user: "ИГРОК", leader: "ЛИДЕР", deputy: "ЗАМЕСТИТЕЛЬ", admin: "АДМИНИСТРАТОР", curator: "КУРАТОР",
  curator_admin: "КУР. АДМИНИСТРАЦИИ", curator_faction: "КУР. ФРАКЦИЙ",
};

export const PENALTY_LABELS: Record<PenaltyType, string> = {
  verbal: "УСТНОЕ ПРЕДУПРЕЖДЕНИЕ",
  reprimand: "ВЫГОВОР",
  excluded: "ИСКЛЮЧЕНИЕ",
};

export const STATUS_COLORS: Record<Status, string> = {
  online: "bg-emerald-400 dot-online",
  afk: "bg-amber-400 dot-afk",
  offline: "bg-zinc-600",
};

export const STATUS_LABELS: Record<Status, string> = {
  online: "ОНЛАЙН", afk: "АФК", offline: "ОФЛАЙН",
};

export const MOCK_USERS: (Player & { token: string; password: string })[] = [
  { id: 1, username: "BlackStar_IX", password: "curator123", token: "mock-token-1", rank: "IV", title: "Командующий", role: "curator", status: "offline", level: 87, xp: 8700, xpMax: 10000, reputation: 9850, onlineToday: 0, onlineWeek: 0, warnings: 0, penalties: [], weekActivity: [0, 0, 0, 0, 0, 0, 0] },
];

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

export async function apiPost(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data: typeof data === "string" ? JSON.parse(data) : data };
}

export async function apiGet(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  return { ok: res.ok, data: typeof data === "string" ? JSON.parse(data) : data };
}