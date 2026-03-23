import { Player, AuthUser, Order, Organization, TableSheet } from "./types";

const BASE = `/api`;

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
  await req("POST", `/users/${userId}/status`, { status });
}

export async function apiAddOnline(userId: number, minutes: number): Promise<void> {
  const d = new Date();
  const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  await req("POST", `/users/${userId}/online`, { minutes, dayIdx });
}

export async function apiAddPlayer(form: {
  username: string; password: string; role: string; title: string; rank: string; createdBy?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await req("POST", "/users", { ...form });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function apiEditPlayer(userId: number, fields: Partial<Player & { password?: string; orgId?: number | null }>): Promise<void> {
  // camelCase → camelCase (Flask принимает как есть)
  await req("PATCH", `/users/${userId}`, fields);
}

export async function apiDeletePlayer(userId: number): Promise<void> {
  await req("DELETE", `/users/${userId}`);
}

export async function apiNotifyVkStatus(_userId: number, _status: string): Promise<void> {
  // VK уведомления — через vk-bot на сервере
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

// ── Organizations ──────────────────────────────────────────────────────────
export async function apiGetOrgs(): Promise<Organization[]> {
  const data = await req<{ orgs: Organization[] }>("GET", "/orgs");
  return data.orgs;
}

export async function apiCreateOrg(org: Partial<Organization>): Promise<Organization> {
  const data = await req<{ ok: boolean; org: Organization }>("POST", "/orgs", org);
  return data.org;
}

export async function apiUpdateOrg(id: number, fields: Partial<Organization>): Promise<void> {
  await req("PATCH", `/orgs/${id}`, fields);
}

export async function apiDeleteOrg(id: number): Promise<void> {
  await req("DELETE", `/orgs/${id}`);
}

// ── Tables ─────────────────────────────────────────────────────────────────
export async function apiGetTables(): Promise<{ org: TableSheet | null; admin: TableSheet | null }> {
  return await req("GET", "/tables");
}

export async function apiUpdateTable(scope: "org" | "admin", table: TableSheet): Promise<void> {
  await req("PATCH", `/tables/${scope}`, table);
}
