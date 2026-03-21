export const API_AUTH = "https://functions.poehali.dev/0faae4ff-54b8-40f4-988a-aa6bbebd01f0";
export const API_USERS = "https://functions.poehali.dev/93e60fdd-bf88-468d-88c8-f312a5f61460";

export type Role = "user" | "leader" | "admin" | "curator";
export type Status = "online" | "afk" | "offline";
export type Tab = "stats" | "leaderboard" | "users" | "moderation" | "admin_panel" | "organizations";

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
  memberIds: number[];
  orgRanks: OrgRank[];             // кастомные ранги организации
  memberRanks: Record<number, number>; // playerId → orgRankId
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

// Проверяет, может ли viewer редактировать target
export function canEditTarget(viewerRole: Role, targetRole: Role): boolean {
  if (viewerRole === "curator") return true;
  if (viewerRole === "admin") return targetRole === "leader" || targetRole === "user";
  if (viewerRole === "leader") return targetRole === "user";
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
  user: "ИГРОК", leader: "ЛИДЕР", admin: "АДМИНИСТРАТОР", curator: "КУРАТОР",
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
  { id: 1, username: "BlackStar_IX", password: "curator123", token: "mock-token-1", rank: "IV", title: "Командующий", role: "curator", status: "online", level: 87, xp: 8700, xpMax: 10000, reputation: 9850, onlineToday: 312, onlineWeek: 2140, warnings: 0, penalties: [], weekActivity: [285, 310, 190, 340, 270, 312, 433] },
  { id: 2, username: "Nexus_Prime",  password: "admin123",   token: "mock-token-2", rank: "III", title: "Генерал",     role: "admin",   status: "online", level: 64, xp: 6400, xpMax: 7000,  reputation: 7200, onlineToday: 185, onlineWeek: 1340, warnings: 0, penalties: [], weekActivity: [145, 200, 185, 220, 185, 160, 245] },
  { id: 3, username: "Shadow_Wolf",  password: "leader123",  token: "mock-token-3", rank: "II",  title: "Майор",       role: "leader",  status: "online", level: 42, xp: 4200, xpMax: 5000,  reputation: 4800, onlineToday: 220, onlineWeek: 1560, warnings: 0, penalties: [], weekActivity: [180, 240, 110, 260, 220, 330, 220] },
  { id: 4, username: "Ghost_Rider",  password: "user123",    token: "mock-token-4", rank: "I",   title: "Сержант",     role: "user",    status: "online", level: 21, xp: 2100, xpMax: 3000,  reputation: 2300, onlineToday: 130, onlineWeek: 890,  warnings: 0, penalties: [], weekActivity: [90,  130,  45, 180,  95, 130, 220] },
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