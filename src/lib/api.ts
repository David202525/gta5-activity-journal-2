import { Player, AuthUser, Order } from "./types";

const BASE = `/api`;
const ORGS_URL   = "https://functions.poehali.dev/ae73137e-e58d-4e74-abea-c2dafc76ed7d";
const TABLES_URL = "https://functions.poehali.dev/4642a289-06cc-4ed2-a527-b2311636902f";

async function req<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify(body ?? {}) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Ошибка сервера");
  return data as T;
}

export async function apiLogin(username: string, password: string): Promise<AuthUser> {
  const data = await req<{ user: AuthUser }>("POST", "/login", { username, password });
  return data.user;
}

export async function apiGetPlayers(): Promise<Player[]> {
  const data = await req<{ users: Player[] }>("GET", "/users");
  return data.users;
}

export async function apiSetStatus(userId: number, status: string): Promise<void> {
  await req("POST", "/users", { action: "set_status", user_id: userId, status });
}

export async function apiAddOnline(userId: number, minutes: number): Promise<void> {
  const d = new Date();
  const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  await req("POST", "/users", { action: "add_online", user_id: userId, minutes, dayIdx });
}

export async function apiAddPlayer(form: {
  username: string; password: string; role: string; title: string; rank: string; createdBy?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await req("POST", "/users", { action: "add_user", ...form, created_by: form.createdBy ?? "" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function apiEditPlayer(userId: number, fields: Partial<Player & { password?: string; orgId?: number | null }>): Promise<void> {
  // маппим camelCase → snake_case для бэкенда
  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === "orgId") mapped["org_id"] = v;
    else if (k === "xpMax") mapped["xp_max"] = v;
    else if (k === "onlineToday") mapped["online_today"] = v;
    else if (k === "onlineWeek") mapped["online_week"] = v;
    else if (k === "weekActivity") mapped["week_activity"] = v;
    else mapped[k] = v;
  }
  await req("POST", "/users", { action: "edit_player", user_id: userId, fields: mapped });
}

export async function apiDeletePlayer(userId: number): Promise<void> {
  await req("POST", "/users", { action: "delete_player", user_id: userId });
}

export async function apiNotifyVkStatus(_userId: number, _status: string): Promise<void> {
  // VK уведомления через vk-bot функцию — пока не реализовано
}

export async function apiGetOrders(): Promise<Order[]> {
  const data = await req<{ orders: Order[] }>("GET", "/orders");
  return data.orders;
}

export async function apiAddOrder(order: Order): Promise<void> {
  await req("POST", "/orders", order);
}

export async function apiDeleteOrder(id: number): Promise<void> {
  await req("DELETE", `/orders/${id}`);
}

// ── Organizations (прямой вызов функции) ──────────────────────
async function orgsReq<T>(method: string, body?: object): Promise<T> {
  const res = await fetch(ORGS_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify(body ?? {}) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Ошибка сервера");
  return data as T;
}

export async function apiGetOrgs(): Promise<import("./types").Organization[]> {
  const data = await orgsReq<{ orgs: import("./types").Organization[] }>("GET");
  return data.orgs;
}

export async function apiCreateOrg(org: Partial<import("./types").Organization>): Promise<import("./types").Organization> {
  const data = await orgsReq<{ ok: boolean; org: import("./types").Organization }>("POST", { action: "create", ...org });
  return data.org;
}

export async function apiUpdateOrg(id: number, fields: Partial<import("./types").Organization>): Promise<void> {
  await orgsReq("POST", { action: "update", id, ...fields });
}

export async function apiDeleteOrg(id: number): Promise<void> {
  await orgsReq("POST", { action: "delete", id });
}

// ── Tables (прямой вызов функции) ─────────────────────────────
export async function apiGetTables(): Promise<{ org: import("./types").TableSheet | null; admin: import("./types").TableSheet | null }> {
  const res = await fetch(TABLES_URL);
  const data = await res.json();
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function apiUpdateTable(scope: "org" | "admin", table: import("./types").TableSheet): Promise<void> {
  await fetch(TABLES_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...table, scope }),
  });
}