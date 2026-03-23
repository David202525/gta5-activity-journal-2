import { Player, AuthUser, Order } from "./types";

const USERS  = "https://functions.poehali.dev/93e60fdd-bf88-468d-88c8-f312a5f61460";
const AUTH   = "https://functions.poehali.dev/0faae4ff-54b8-40f4-988a-aa6bbebd01f0";
const ORDERS = "https://functions.poehali.dev/ec65c93f-9552-4d66-a9f5-4949602f6cf4";

async function req<T>(url: string, method: string, body?: object): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify(body ?? {}) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Ошибка сервера");
  return data as T;
}

export async function apiLogin(username: string, password: string): Promise<AuthUser> {
  const data = await req<{ user: AuthUser }>(AUTH, "POST", { username, password });
  return data.user;
}

export async function apiGetPlayers(): Promise<Player[]> {
  const data = await req<{ users: Player[] }>(USERS, "GET");
  return data.users;
}

export async function apiSetStatus(userId: number, status: string): Promise<void> {
  await req(USERS, "POST", { action: "set_status", user_id: userId, status });
}

export async function apiAddOnline(userId: number, minutes: number): Promise<void> {
  const d = new Date();
  const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  await req(USERS, "POST", { action: "add_online", user_id: userId, minutes, dayIdx });
}

export async function apiAddPlayer(form: {
  username: string; password: string; role: string; title: string; rank: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await req(USERS, "POST", { action: "add_user", ...form });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function apiEditPlayer(userId: number, fields: Partial<Player & { password?: string }>): Promise<void> {
  await req(USERS, "POST", { action: "edit_player", user_id: userId, fields });
}

export async function apiDeletePlayer(userId: number): Promise<void> {
  await req(USERS, "POST", { action: "delete_player", user_id: userId });
}

export async function apiGetOrders(): Promise<Order[]> {
  const data = await req<{ orders: Order[] }>(ORDERS, "GET");
  return data.orders;
}

export async function apiAddOrder(order: Order): Promise<void> {
  await req(ORDERS, "POST", order);
}

export async function apiDeleteOrder(id: number): Promise<void> {
  await req(`${ORDERS}/${id}`, "DELETE");
}