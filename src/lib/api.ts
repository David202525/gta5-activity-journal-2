import { Player, AuthUser, Order, API_AUTH, API_USERS, API_ORDERS } from "./types";

async function call<T>(url: string, method: string, body?: object): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Ошибка сервера");
  return data as T;
}

export async function apiLogin(username: string, password: string): Promise<AuthUser> {
  const data = await call<{ user: AuthUser }>(API_AUTH, "POST", { username, password });
  return data.user;
}

export async function apiGetPlayers(): Promise<Player[]> {
  const data = await call<{ users: Player[] }>(API_USERS, "GET");
  return data.users;
}

export async function apiSetStatus(userId: number, status: string): Promise<void> {
  await call(API_USERS, "POST", { action: "set_status", user_id: userId, status });
}

export async function apiAddOnline(userId: number, minutes: number): Promise<void> {
  const d = new Date();
  const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  await call(API_USERS, "POST", { action: "add_online", user_id: userId, minutes, dayIdx });
}

export async function apiAddPlayer(form: {
  username: string; password: string; role: string; title: string; rank: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await call(API_USERS, "POST", { action: "add_user", ...form });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function apiEditPlayer(userId: number, fields: Partial<Player & { password?: string }>): Promise<void> {
  await call(API_USERS, "POST", { action: "edit_player", user_id: userId, fields });
}

export async function apiDeletePlayer(userId: number): Promise<void> {
  await call(API_USERS, "POST", { action: "delete_player", user_id: userId });
}

export async function apiGetOrders(): Promise<Order[]> {
  const data = await call<{ orders: Order[] }>(API_ORDERS, "GET");
  return data.orders;
}

export async function apiAddOrder(order: Order): Promise<void> {
  await call(API_ORDERS, "POST", order);
}

export async function apiDeleteOrder(id: number): Promise<void> {
  await call(`${API_ORDERS}/${id}`, "DELETE");
}