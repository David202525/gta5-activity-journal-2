import { Player, AuthUser, Order } from "./types";

const BASE = `/api`;

async function req<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
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
  username: string; password: string; role: string; title: string; rank: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await req("POST", "/users", { action: "add_user", ...form });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function apiEditPlayer(userId: number, fields: Partial<Player & { password?: string }>): Promise<void> {
  await req("POST", "/users", { action: "edit_player", user_id: userId, fields });
}

export async function apiDeletePlayer(userId: number): Promise<void> {
  await req("POST", "/users", { action: "delete_player", user_id: userId });
}

export async function apiGetOrders(): Promise<Order[]> {
  const data = await req<{ orders: Order[] }>("GET", "/orders");
  return data.orders;
}

export async function apiAddOrder(order: Order): Promise<void> {
  await req("POST", "/orders", order);
}

export async function apiDeleteOrder(id: number): Promise<void> {
  await req("DELETE", `/orders/${id}`, {});
}