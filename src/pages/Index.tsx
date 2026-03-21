import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API_AUTH = "https://functions.poehali.dev/0faae4ff-54b8-40f4-988a-aa6bbebd01f0";
const API_USERS = "https://functions.poehali.dev/93e60fdd-bf88-468d-88c8-f312a5f61460";

// ─── MOCK DATA (используется если API недоступен) ─────────────
const MOCK_USERS: (Player & { token: string; password: string })[] = [
  { id: 1, username: "BlackStar_IX", password: "curator123", token: "mock-token-1", rank: "IV", title: "Командующий", role: "curator", status: "online", level: 87, xp: 8700, xpMax: 10000, reputation: 9850, onlineToday: 312, onlineWeek: 2140, warnings: 0 },
  { id: 2, username: "Nexus_Prime",  password: "admin123",   token: "mock-token-2", rank: "III", title: "Генерал",     role: "admin",   status: "online", level: 64, xp: 6400, xpMax: 7000,  reputation: 7200, onlineToday: 185, onlineWeek: 1340, warnings: 0 },
  { id: 3, username: "Shadow_Wolf",  password: "leader123",  token: "mock-token-3", rank: "II",  title: "Майор",       role: "leader",  status: "online", level: 42, xp: 4200, xpMax: 5000,  reputation: 4800, onlineToday: 220, onlineWeek: 1560, warnings: 0 },
  { id: 4, username: "Ghost_Rider",  password: "user123",    token: "mock-token-4", rank: "I",   title: "Сержант",     role: "user",    status: "online", level: 21, xp: 2100, xpMax: 3000,  reputation: 2300, onlineToday: 130, onlineWeek: 890,  warnings: 0 },
];

async function apiPost(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data: typeof data === "string" ? JSON.parse(data) : data };
}

async function apiGet(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  return { ok: res.ok, data: typeof data === "string" ? JSON.parse(data) : data };
}

type Role = "user" | "leader" | "admin" | "curator";
type Status = "online" | "afk" | "offline";
type Tab = "stats" | "leaderboard" | "users" | "moderation" | "admin_panel";

interface Player {
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
}

interface AuthUser extends Player { token: string; }

const ROLE_LABELS: Record<Role, string> = {
  user: "ИГРОК", leader: "ЛИДЕР", admin: "АДМИНИСТРАТОР", curator: "КУРАТОР",
};

const STATUS_COLORS: Record<Status, string> = {
  online: "bg-emerald-400 dot-online",
  afk: "bg-amber-400 dot-afk",
  offline: "bg-zinc-600",
};

const STATUS_LABELS: Record<Status, string> = {
  online: "ОНЛАЙН", afk: "АФК", offline: "ОФЛАЙН",
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

function RoleBadge({ role }: { role: Role }) {
  const cls: Record<Role, string> = {
    user: "text-zinc-400 border-zinc-700 bg-zinc-800/40",
    leader: "text-amber-400 border-amber-800 bg-amber-900/20",
    admin: "text-indigo-400 border-indigo-800 bg-indigo-900/20",
    curator: "text-pink-400 border-pink-800 bg-pink-900/20",
  };
  return (
    <span className={`text-[9px] font-hud tracking-widest px-2 py-0.5 border rounded-full ${cls[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusDot({ status }: { status: Status }) {
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[status]}`} />;
}

function XPBar({ value, max, color = "xp-bar" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── LOGIN ───────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMockHint, setShowMockHint] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Введите ник и пароль"); return; }
    setLoading(true); setError("");
    try {
      const { ok, data } = await apiPost(API_AUTH, { action: "login", username: username.trim(), password });
      if (!ok || data.error) setError(data.error || "Ошибка входа");
      else onLogin(data.user);
    } catch {
      // Fallback: мок-режим если сервер недоступен
      setShowMockHint(true);
      const found = MOCK_USERS.find(u => u.username === username.trim() && u.password === password);
      if (found) {
        const { password: _p, ...user } = found;
        void _p;
        onLogin({ ...user, status: "online" });
      } else {
        setError("Неверный ник или пароль");
      }
    }
    finally { setLoading(false); }
  };

  return (
    <div className="hud-scanlines min-h-screen bg-[#09060f] flex items-center justify-center px-4">
      {/* Ambient glow blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-800/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.5)]">
              <Icon name="Zap" size={32} className="text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/30 to-pink-500/20 blur-md -z-10" />
          </div>
          <h1 className="font-hud text-3xl tracking-widest gradient-text text-center">АФК ЖУРНАЛ</h1>
          <p className="font-mono-hud text-[10px] text-purple-400/50 tracking-widest mt-1.5">GTA ACTIVITY HUB v2.0</p>
        </div>

        {/* Card */}
        <div className="hud-panel p-7">
          <div className="font-hud text-[11px] tracking-widest text-purple-400/60 mb-6 text-center uppercase">
            Идентификация участника
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-hud tracking-widest text-purple-300/50 uppercase block mb-2">Ник</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-3 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 transition-all"
                placeholder="Введите ваш ник..."
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-[10px] font-hud tracking-widest text-purple-300/50 uppercase block mb-2">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-3 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 font-mono-hud bg-red-500/8 border border-red-500/20 px-3 py-2.5 rounded-lg">
                <Icon name="AlertCircle" size={13} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-hud w-full py-3 mt-1 rounded-xl font-hud text-sm tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)", boxShadow: "0 4px 24px rgba(124,58,237,0.45)" }}
            >
              {loading ? "ПРОВЕРКА..." : "ВОЙТИ В СИСТЕМУ"}
            </button>
          </form>

          {showMockHint && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon name="WifiOff" size={11} className="text-amber-400" />
                <span className="text-[10px] font-hud tracking-wider text-amber-400">СЕРВЕР НЕДОСТУПЕН — МОК-РЕЖИМ</span>
              </div>
              <div className="space-y-1">
                {MOCK_USERS.map(u => (
                  <button key={u.id} onClick={() => { setUsername(u.username); setPassword(u.password); }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all text-left">
                    <span className="font-mono-hud text-[10px] text-purple-300">{u.username}</span>
                    <RoleBadge role={u.role} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-purple-900/80 font-mono-hud">
              Доступ предоставляется куратором или администратором
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER ROW ───────────────────────────────────────────────
function PlayerRow({ player, index, canEdit, onAddWarning, onRemoveWarning }: {
  player: Player; index: number; canEdit: boolean;
  onAddWarning?: (id: number) => void; onRemoveWarning?: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="animate-fade-in" style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}>
      <div
        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all rounded-xl mx-2 my-0.5
          ${expanded
            ? "bg-purple-900/20 border border-purple-700/30"
            : "border border-transparent hover:bg-purple-900/10 hover:border-purple-800/20"
          }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="font-mono-hud text-xs text-purple-900/80 w-5 text-center">{index + 1}</div>
        <StatusDot status={player.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-hud text-sm tracking-wide text-purple-100">{player.username}</span>
            <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/80">RNK {player.rank}</span>
          </div>
          <div className="text-[10px] text-purple-700 font-mono-hud mt-0.5">{player.title}</div>
        </div>
        <div className="hidden sm:block"><RoleBadge role={player.role} /></div>
        <div className="text-right min-w-[64px]">
          <div className="font-hud text-sm neon-gold">LVL {player.level}</div>
          <div className="text-[10px] text-purple-700 font-mono-hud">{player.reputation.toLocaleString()} REP</div>
        </div>
        <div className="hidden md:block text-right w-20">
          <div className="text-xs text-purple-400 font-mono-hud">{formatTime(player.onlineToday)}</div>
          <div className="text-[10px] text-purple-800 font-mono-hud">сегодня</div>
        </div>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-purple-700 flex-shrink-0" />
      </div>

      {expanded && (
        <div className="mx-3 mb-2 p-4 bg-purple-950/40 border border-purple-800/20 rounded-xl animate-scale-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "ОНЛАЙН НЕДЕЛЯ", val: formatTime(player.onlineWeek), cls: "text-purple-300" },
              {
                label: "СТАТУС",
                val: STATUS_LABELS[player.status],
                cls: player.status === "online" ? "neon-green" : player.status === "afk" ? "text-amber-400" : "text-zinc-500",
              },
              {
                label: "ПРЕДУПРЕЖДЕНИЯ",
                val: player.warnings > 0 ? `⚠ ${player.warnings}` : "—",
                cls: player.warnings > 0 ? "neon-red" : "text-purple-800",
              },
              { label: "XP", val: `${player.xp.toLocaleString()} / ${player.xpMax.toLocaleString()}`, cls: "text-purple-300" },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-[10px] text-purple-800 font-hud tracking-wider mb-1">{item.label}</div>
                <div className={`text-sm font-mono-hud ${item.cls}`}>{item.val}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-800 font-hud w-14">XP</span>
              <XPBar value={player.xp} max={player.xpMax} color="xp-bar" />
              <span className="text-[10px] font-mono-hud text-purple-700 w-8 text-right">{Math.round((player.xp / player.xpMax) * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-800 font-hud w-14">REP</span>
              <XPBar value={player.reputation} max={10000} color="rep-bar" />
              <span className="text-[10px] font-mono-hud text-purple-700 w-8 text-right">{Math.round((player.reputation / 10000) * 100)}%</span>
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-purple-900/40">
              <button onClick={e => { e.stopPropagation(); onAddWarning?.(player.id); }}
                className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-lg hover:bg-red-500/18 transition-all">
                + ПРЕДУПРЕЖДЕНИЕ
              </button>
              {player.warnings > 0 && (
                <button onClick={e => { e.stopPropagation(); onRemoveWarning?.(player.id); }}
                  className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg hover:bg-emerald-500/18 transition-all">
                  СНЯТЬ ПРЕДУПР.
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────
function StatCard({ label, value, icon, sub, delay = 0 }: {
  label: string; value: string; icon: string; sub?: string; delay?: number;
}) {
  return (
    <div className="hud-panel stat-card p-5 animate-fade-in" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-hud tracking-widest text-purple-600 uppercase">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-violet-900/40 flex items-center justify-center">
          <Icon name={icon} size={13} className="text-violet-400" />
        </div>
      </div>
      <div className="font-hud text-2xl gradient-text">{value}</div>
      {sub && <div className="text-xs text-purple-700 mt-1 font-mono-hud">{sub}</div>}
    </div>
  );
}

// ─── ADD USER FORM ───────────────────────────────────────────
function AddUserForm({ viewerRole, currentUsername, onAdded }: {
  viewerRole: Role; currentUsername: string; onAdded: () => void;
}) {
  const [form, setForm] = useState({ username: "", password: "", role: "user", title: "Новобранец", rank: "I" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) { setMsg({ text: "Заполните ник и пароль", ok: false }); return; }
    setLoading(true); setMsg(null);
    try {
      const { data } = await apiPost(API_USERS, { action: "add_user", ...form, created_by: currentUsername });
      if (data.ok) {
        setMsg({ text: `Участник ${form.username} добавлен!`, ok: true });
        setForm({ username: "", password: "", role: "user", title: "Новобранец", rank: "I" });
        onAdded();
      } else setMsg({ text: data.error || "Ошибка", ok: false });
    } catch {
      setMsg({ text: `[МОК] Участник ${form.username} добавлен (локально)`, ok: true });
      setForm({ username: "", password: "", role: "user", title: "Новобранец", rank: "I" });
      onAdded();
    }
    finally { setLoading(false); }
  };

  const inputCls = "w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-2.5 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 transition-all";
  const labelCls = "text-[10px] font-hud tracking-widest text-purple-600 uppercase block mb-2";

  return (
    <div className="hud-panel p-6">
      <div className="font-hud text-xs tracking-widest text-purple-400/70 mb-5 flex items-center gap-2">
        <Icon name="UserPlus" size={13} className="text-violet-400" />
        ДОБАВИТЬ УЧАСТНИКА
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Ник</label>
            <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className={inputCls} placeholder="Имя_игрока" />
          </div>
          <div>
            <label className={labelCls}>Пароль</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={inputCls} placeholder="••••••••" />
          </div>
          <div>
            <label className={labelCls}>Звание</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Рядовой" />
          </div>
          <div>
            <label className={labelCls}>Ранг</label>
            <select value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value }))} className={inputCls}>
              {["I", "II", "III", "IV"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Роль</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls}>
              <option value="user">ИГРОК</option>
              <option value="leader">ЛИДЕР</option>
              {(viewerRole === "admin" || viewerRole === "curator") && <option value="admin">АДМИНИСТРАТОР</option>}
              {viewerRole === "curator" && <option value="curator">КУРАТОР</option>}
            </select>
          </div>
        </div>

        {msg && (
          <div className={`text-xs font-mono-hud px-4 py-2.5 rounded-lg border flex items-center gap-2 ${msg.ok ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8" : "text-red-400 border-red-500/20 bg-red-500/8"}`}>
            <Icon name={msg.ok ? "CheckCircle" : "AlertCircle"} size={12} />
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="btn-hud font-hud text-[11px] tracking-widest px-6 py-3 text-white rounded-xl disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
          {loading ? "ДОБАВЛЕНИЕ..." : "ДОБАВИТЬ В ОРГАНИЗАЦИЮ"}
        </button>
      </form>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────
export default function Index() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [myStatus, setMyStatus] = useState<Status>("online");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const [isMock, setIsMock] = useState(false);

  const fetchPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      const { data } = await apiGet(API_USERS);
      if (data.users) { setPlayers(data.users); setIsMock(false); }
    } catch {
      // Мок-режим: используем локальные данные
      setPlayers(MOCK_USERS.map(({ password: _p, token: _t, ...u }) => { void _p; void _t; return u; }));
      setIsMock(true);
    }
    finally { setLoadingPlayers(false); }
  }, []);

  useEffect(() => { if (authUser) fetchPlayers(); }, [authUser, fetchPlayers]);

  const handleLogin = (user: AuthUser) => { setAuthUser(user); setMyStatus(user.status as Status); };
  const handleLogout = () => { setAuthUser(null); setPlayers([]); setActiveTab("stats"); setIsMock(false); };

  const handleStatusChange = async (status: Status) => {
    setMyStatus(status);
    if (!authUser) return;
    try { await apiPost(API_USERS, { action: "set_status", user_id: authUser.id, status }); }
    catch { /* мок: обновляем локально */ }
  };

  const handleAddWarning = async (userId: number) => {
    try { await apiPost(API_USERS, { action: "add_warning", user_id: userId }); }
    catch { /* мок */ }
    if (isMock) setPlayers(p => p.map(u => u.id === userId ? { ...u, warnings: u.warnings + 1 } : u));
    else fetchPlayers();
  };
  const handleRemoveWarning = async (userId: number) => {
    try { await apiPost(API_USERS, { action: "remove_warning", user_id: userId }); }
    catch { /* мок */ }
    if (isMock) setPlayers(p => p.map(u => u.id === userId ? { ...u, warnings: Math.max(0, u.warnings - 1) } : u));
    else fetchPlayers();
  };

  if (!authUser) return <LoginScreen onLogin={handleLogin} />;

  const viewerRole = authUser.role as Role;
  const canAccessAdmin = viewerRole === "admin" || viewerRole === "curator";
  const canManageUsers = viewerRole === "admin" || viewerRole === "curator" || viewerRole === "leader";
  const canSeeFullStats = viewerRole === "curator";

  const TABS: { id: Tab; label: string; icon: string; visible: boolean }[] = [
    { id: "stats", label: "Статистика", icon: "Activity", visible: true },
    { id: "leaderboard", label: "Рейтинг", icon: "Trophy", visible: true },
    { id: "users", label: "Участники", icon: "Users", visible: canManageUsers },
    { id: "moderation", label: "Модерация", icon: "Shield", visible: canManageUsers },
    { id: "admin_panel", label: "Панель", icon: "Settings", visible: canAccessAdmin },
  ].filter(t => t.visible);

  const onlinePlayers = players.filter(p => p.status === "online").length;
  const afkPlayers = players.filter(p => p.status === "afk").length;
  const totalOnlineToday = players.reduce((s, p) => s + p.onlineToday, 0);
  const sorted = [...players].sort((a, b) => b.reputation - a.reputation);
  const myRank = sorted.findIndex(p => p.id === authUser.id) + 1;

  return (
    <div className="hud-scanlines min-h-screen bg-[#09060f] text-purple-100 font-body">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-800/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-900/12 rounded-full blur-3xl" />
      </div>

      {/* ── HEADER ── */}
      <header className="border-b border-purple-900/50 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.4)]">
              <Icon name="Zap" size={16} className="text-white" />
            </div>
            <div>
              <div className="font-hud text-sm tracking-widest gradient-text leading-none">АФК ЖУРНАЛ</div>
              <div className="font-mono-hud text-[9px] text-purple-800 tracking-widest">GTA ACTIVITY HUB</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            {isMock && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25">
                <Icon name="WifiOff" size={11} className="text-amber-400" />
                <span className="font-mono-hud text-[10px] text-amber-400">МОК-РЕЖИМ</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-online" />
              <span className="font-mono-hud text-xs text-purple-500">{onlinePlayers} онлайн</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 dot-afk" />
              <span className="font-mono-hud text-xs text-purple-500">{afkPlayers} АФК</span>
            </div>
            <span className="font-mono-hud text-xs text-purple-800">
              {new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="font-hud text-xs text-purple-200">{authUser.username}</div>
              <RoleBadge role={viewerRole} />
            </div>
            <button onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-white/4 border border-purple-900/60 flex items-center justify-center hover:border-red-500/40 hover:bg-red-500/10 transition-all group">
              <Icon name="LogOut" size={14} className="text-purple-700 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── PROFILE CARD ── */}
        <div className="hud-panel p-5 mb-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-700/50 to-purple-900/50 border border-violet-600/30 flex items-center justify-center">
                  <Icon name="User" size={22} className="text-violet-300" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#09060f] ${STATUS_COLORS[myStatus]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-hud text-xl tracking-wide gradient-text">{authUser.username}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/80">РАНГ {authUser.rank}</span>
                  <span className="text-xs text-purple-600 font-mono-hud">{authUser.title}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 max-w-[260px]">
                  <XPBar value={authUser.xp} max={authUser.xpMax} color="xp-bar" />
                  <span className="text-[10px] font-mono-hud text-purple-600 whitespace-nowrap">LVL {authUser.level}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-hud tracking-widest text-purple-700 mb-2 uppercase">Мой статус</div>
              <div className="flex gap-2">
                {(["online", "afk", "offline"] as Status[]).map(s => (
                  <button key={s} onClick={() => handleStatusChange(s)}
                    className={`btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                      myStatus === s
                        ? s === "online" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : s === "afk" ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                          : "bg-zinc-700/20 border-zinc-600/40 text-zinc-400"
                        : "bg-transparent border-purple-900/40 text-purple-700 hover:border-purple-700/50 hover:text-purple-400"
                    }`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 mb-5 bg-black/20 p-1 rounded-xl border border-purple-900/30 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-[11px] font-hud tracking-wider whitespace-nowrap rounded-lg transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? "bg-violet-700/40 text-violet-200 border border-violet-600/40 shadow-[0_2px_12px_rgba(124,58,237,0.3)]"
                  : "text-purple-700 hover:text-purple-400 hover:bg-purple-900/20"
              }`}>
              <Icon name={tab.icon} size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── STATISTICS ── */}
        {activeTab === "stats" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Онлайн сегодня" value={formatTime(authUser.onlineToday)} icon="Clock" sub="личная" delay={0} />
              <StatCard label="За неделю" value={formatTime(authUser.onlineWeek)} icon="Calendar" sub="7 дней" delay={60} />
              <StatCard label="Репутация" value={authUser.reputation.toLocaleString()} icon="Star" sub={myRank > 0 ? `ТОП ${myRank}` : "—"} delay={120} />
              <StatCard label="Уровень" value={`LVL ${authUser.level}`} icon="TrendingUp" sub={`${authUser.xp}/${authUser.xpMax} XP`} delay={180} />
            </div>

            {/* Activity chart */}
            <div className="hud-panel p-5 animate-fade-in" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-hud text-sm tracking-wider text-purple-400">АКТИВНОСТЬ ЗА НЕДЕЛЮ</div>
                <span className="font-mono-hud text-[10px] text-purple-700">часы</span>
              </div>
              <div className="flex items-end gap-2 h-20">
                {[2.1, 3.4, 1.8, 4.2, 3.1, 2.8, 3.7].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full rounded-lg relative overflow-hidden" style={{ height: `${(val / 5) * 70}px` }}>
                      <div className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(124,58,237,0.7), rgba(192,132,252,0.3))", borderRadius: "8px" }} />
                    </div>
                    <span className="font-mono-hud text-[9px] text-purple-700">
                      {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reputation bars */}
            <div className="hud-panel p-5 animate-fade-in" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
              <div className="font-hud text-sm tracking-wider text-purple-400 mb-4">СИСТЕМА РЕПУТАЦИИ</div>
              <div className="space-y-3.5">
                {[
                  { label: "Боевая репутация", val: 78, color: "xp-bar" },
                  { label: "Социальная репутация", val: 52, color: "rep-bar" },
                  { label: "Рейтинг надёжности", val: 91, color: "xp-bar" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-purple-600 font-hud w-44">{item.label}</span>
                    <div className="flex-1"><XPBar value={item.val} max={100} color={item.color} /></div>
                    <span className="font-mono-hud text-xs text-purple-500 w-8 text-right">{item.val}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {activeTab === "leaderboard" && (
          <div className="hud-panel overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-purple-900/40 flex items-center justify-between">
              <div className="font-hud text-sm tracking-wider text-purple-400">
                ТАБЛИЦА ЛИДЕРОВ <span className="text-purple-700 ml-2 text-xs">по репутации</span>
              </div>
              {canSeeFullStats && (
                <span className="text-[10px] font-hud text-pink-400 border border-pink-800/40 bg-pink-900/20 px-2.5 py-1 rounded-full">
                  КУРАТОР
                </span>
              )}
            </div>
            {loadingPlayers ? (
              <div className="p-10 text-center font-mono-hud text-xs text-purple-800">ЗАГРУЗКА...</div>
            ) : (
              <div className="py-2">
                {sorted.map((player, i) => (
                  <PlayerRow key={player.id} player={player} index={i} canEdit={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === "users" && canManageUsers && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="font-hud text-sm tracking-wider text-purple-400">СПИСОК УЧАСТНИКОВ</div>
              <button onClick={fetchPlayers}
                className="btn-hud flex items-center gap-2 text-[11px] font-hud tracking-wider px-3 py-2 bg-purple-900/30 border border-purple-800/40 text-purple-400 rounded-xl hover:bg-purple-800/30 transition-all">
                <Icon name="RefreshCw" size={11} />
                ОБНОВИТЬ
              </button>
            </div>
            <div className="hud-panel overflow-hidden py-2">
              {players.map((player, i) => (
                <PlayerRow key={player.id} player={player} index={i} canEdit={true}
                  onAddWarning={handleAddWarning} onRemoveWarning={handleRemoveWarning} />
              ))}
            </div>
          </div>
        )}

        {/* ── MODERATION ── */}
        {activeTab === "moderation" && canManageUsers && (
          <div className="space-y-4 animate-fade-in">
            <div className="font-hud text-sm tracking-wider text-purple-400">ПАНЕЛЬ МОДЕРАЦИИ</div>

            <div className="hud-panel overflow-hidden">
              <div className="px-5 py-3.5 border-b border-purple-900/40 flex items-center gap-2">
                <Icon name="AlertTriangle" size={13} className="text-red-400" />
                <div className="font-hud text-xs tracking-widest text-red-400">АКТИВНЫЕ ПРЕДУПРЕЖДЕНИЯ</div>
              </div>
              {players.filter(p => p.warnings > 0).length === 0 ? (
                <div className="p-8 text-center font-mono-hud text-xs text-purple-800">Нарушений не зафиксировано</div>
              ) : players.filter(p => p.warnings > 0).map(player => (
                <div key={player.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-purple-900/20 last:border-0">
                  <StatusDot status={player.status} />
                  <div className="flex-1">
                    <div className="font-hud text-sm text-purple-100">{player.username}</div>
                    <div className="text-[10px] text-purple-700 font-mono-hud">{player.title}</div>
                  </div>
                  <RoleBadge role={player.role} />
                  <div className="font-mono-hud text-sm neon-red">⚠ {player.warnings}</div>
                  <button onClick={() => handleRemoveWarning(player.id)}
                    className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg hover:bg-emerald-500/18 transition-all">
                    СНЯТЬ
                  </button>
                </div>
              ))}
            </div>

            {players.filter(p => p.status === "afk").length > 0 && (
              <div className="hud-panel p-4 border-amber-800/30">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Icon name="Clock" size={14} className="text-amber-400" />
                  </div>
                  <div>
                    <div className="font-hud text-xs tracking-widest text-amber-400 mb-1">АФК УЧАСТНИКИ</div>
                    <div className="text-xs text-purple-600 font-mono-hud">
                      {players.filter(p => p.status === "afk").map(p => p.username).join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN PANEL ── */}
        {activeTab === "admin_panel" && canAccessAdmin && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="font-hud text-sm tracking-wider text-purple-400">ПАНЕЛЬ АДМИНИСТРАТОРА</div>
              <RoleBadge role={viewerRole} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Admin online */}
              <div className="hud-panel overflow-hidden">
                <div className="px-5 py-3.5 border-b border-purple-900/40 flex items-center gap-2">
                  <Icon name="Activity" size={12} className="text-indigo-400" />
                  <div className="font-hud text-xs tracking-widest text-indigo-400">ОНЛАЙН АДМИНИСТРАЦИИ</div>
                </div>
                <div className="p-4 space-y-3">
                  {players.filter(p => p.role === "admin" || p.role === "curator").map(player => (
                    <div key={player.id} className="flex items-center gap-3">
                      <StatusDot status={player.status} />
                      <div className="flex-1">
                        <div className="text-xs font-hud text-purple-200">{player.username}</div>
                        <div className="text-[10px] text-purple-700 font-mono-hud">Сегодня: {formatTime(player.onlineToday)}</div>
                      </div>
                      <RoleBadge role={player.role} />
                    </div>
                  ))}
                  {players.filter(p => p.role === "admin" || p.role === "curator").length === 0 && (
                    <div className="text-xs text-purple-800 font-mono-hud text-center py-2">Нет данных</div>
                  )}
                </div>
              </div>

              {/* AFK stats (curator only) */}
              <div className={`hud-panel overflow-hidden ${!canSeeFullStats ? "opacity-35 pointer-events-none" : ""}`}>
                <div className="px-5 py-3.5 border-b border-purple-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="BarChart3" size={12} className="text-pink-400" />
                    <div className="font-hud text-xs tracking-widest text-pink-400">СТАТИСТИКА АФК</div>
                  </div>
                  {!canSeeFullStats && (
                    <div className="flex items-center gap-1 text-[10px] font-hud text-purple-800">
                      <Icon name="Lock" size={10} />
                      КУРАТОР
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2.5">
                  {[
                    { label: "Общий онлайн сегодня", val: formatTime(totalOnlineToday), icon: "Clock" },
                    { label: "Участников онлайн", val: `${onlinePlayers} / ${players.length}`, icon: "Users" },
                    { label: "АФК нарушений", val: `${players.filter(p => p.warnings > 0).length}`, icon: "AlertTriangle" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-purple-900/20 last:border-0">
                      <div className="flex items-center gap-2 text-xs text-purple-600">
                        <Icon name={item.icon} size={11} className="text-purple-800" />
                        {item.label}
                      </div>
                      <span className="font-mono-hud text-xs gradient-text font-medium">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <AddUserForm viewerRole={viewerRole} currentUsername={authUser.username} onAdded={fetchPlayers} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-purple-900/30 mt-8 py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="font-mono-hud text-[10px] text-purple-900 tracking-widest">GTA ACTIVITY HUB · {new Date().toLocaleDateString("ru")}</div>
          <div className="font-mono-hud text-[10px] text-purple-900">УЧАСТНИКОВ: {players.length} · ОНЛАЙН: {onlinePlayers}</div>
        </div>
      </div>
    </div>
  );
}