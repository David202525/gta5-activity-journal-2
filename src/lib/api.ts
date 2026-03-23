import { Player, AuthUser, Order } from "./types";

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
  username: string; password: string; role: string; title: string; rank: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await req("POST", "/users", form);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function apiEditPlayer(userId: number, fields: Partial<Player & { password?: string }>): Promise<void> {
  await req("PATCH", `/users/${userId}`, fields);
}

export async function apiDeletePlayer(userId: number): Promise<void> {
  await req("DELETE", `/users/${userId}`);
}

export async function apiNotifyVkStatus(userId: number, status: string): Promise<void> {
  await req("POST", `/users/${userId}/notify-vk`, { status });
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

// ── Organizations ─────────────────────────────────────────────
export async function apiGetOrgs(): Promise<import("./types").Organization[]> {
  const data = await req<{ orgs: import("./types").Organization[] }>("GET", "/orgs");
  return data.orgs;
}

export async function apiCreateOrg(org: Partial<import("./types").Organization>): Promise<import("./types").Organization> {
  const data = await req<{ org: import("./types").Organization }>("POST", "/orgs", org);
  return data.org;
}

export async function apiUpdateOrg(id: number, fields: Partial<import("./types").Organization>): Promise<void> {
  await req("PATCH", `/orgs/${id}`, fields);
}

export async function apiDeleteOrg(id: number): Promise<void> {
  await req("DELETE", `/orgs/${id}`);
}

// ── Tables ────────────────────────────────────────────────────
export async function apiGetTables(): Promise<{ org: import("./types").TableSheet | null; admin: import("./types").TableSheet | null }> {
  return req("GET", "/tables");
}

export async function apiUpdateTable(scope: "org" | "admin", table: import("./types").TableSheet): Promise<void> {
  await req("PATCH", `/tables/${scope}`, table);
}