import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API_AUTH = "https://functions.poehali.dev/0faae4ff-54b8-40f4-988a-aa6bbebd01f0";
const API_USERS = "https://functions.poehali.dev/93e60fdd-bf88-468d-88c8-f312a5f61460";

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

interface AuthUser extends Player {
  token: string;
}

const ROLE_LABELS: Record<Role, string> = {
  user: "ИГРОК",
  leader: "ЛИДЕР",
  admin: "АДМИНИСТРАТОР",
  curator: "КУРАТОР",
};

const STATUS_COLORS: Record<Status, string> = {
  online: "bg-green-400 dot-online",
  afk: "bg-yellow-400 dot-afk",
  offline: "bg-gray-600",
};

const STATUS_LABELS: Record<Status, string> = {
  online: "ОНЛАЙН",
  afk: "АФК",
  offline: "ОФЛАЙН",
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

function RoleBadge({ role }: { role: Role }) {
  const cls: Record<Role, string> = {
    user: "text-gray-400 border-gray-600",
    leader: "text-yellow-400 border-yellow-700",
    admin: "text-cyan-400 border-cyan-800",
    curator: "text-orange-400 border-orange-700",
  };
  return (
    <span className={`text-[10px] font-hud tracking-widest px-2 py-0.5 border rounded-sm ${cls[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusDot({ status }: { status: Status }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />;
}

function XPBar({ value, max, color = "xp-bar" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── LOGIN SCREEN ───────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Введите ник и пароль");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username: username.trim(), password }),
      });
      const data = await res.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (!res.ok || parsed.error) {
        setError(parsed.error || "Ошибка входа");
      } else {
        onLogin(parsed.user);
      }
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hud-scanlines min-h-screen bg-[#070a10] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-yellow-400 flex items-center justify-center mb-4"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)' }}>
            <Icon name="Zap" size={28} className="text-black" />
          </div>
          <div className="font-hud text-2xl tracking-widest neon-gold text-center">АФК ЖУРНАЛ</div>
          <div className="font-mono-hud text-[10px] text-gray-600 tracking-widest mt-1">GTA ACTIVITY HUB v2.0</div>
        </div>

        {/* Panel */}
        <div className="hud-panel p-6">
          <div className="font-hud text-xs tracking-widest text-gray-500 mb-5 text-center">
            ИДЕНТИФИКАЦИЯ УЧАСТНИКА
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="text-[10px] font-hud tracking-widest text-gray-600 mb-1.5">НИК</div>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-gray-100 text-sm px-3 py-2.5 rounded-sm font-mono-hud focus:outline-none focus:border-yellow-400/50 placeholder:text-gray-700 transition-colors"
                placeholder="Введите ваш ник..."
                autoComplete="username"
              />
            </div>
            <div>
              <div className="text-[10px] font-hud tracking-widest text-gray-600 mb-1.5">ПАРОЛЬ</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-gray-100 text-sm px-3 py-2.5 rounded-sm font-mono-hud focus:outline-none focus:border-yellow-400/50 placeholder:text-gray-700 transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 font-mono-hud bg-red-400/5 border border-red-400/20 px-3 py-2 rounded-sm">
                <Icon name="AlertCircle" size={12} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-hud w-full py-2.5 mt-2 bg-yellow-400 text-black font-hud text-sm tracking-widest rounded-sm hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "ПРОВЕРКА..." : "ВОЙТИ В СИСТЕМУ"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-700 font-mono-hud">
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
  player: Player;
  index: number;
  canEdit: boolean;
  onAddWarning?: (id: number) => void;
  onRemoveWarning?: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="animate-fade-in" style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}>
      <div
        className={`flex items-center gap-3 px-4 py-3 border border-transparent hover:border-yellow-400/20 hover:bg-white/[0.02] transition-all cursor-pointer rounded-sm ${expanded ? 'border-yellow-400/20 bg-white/[0.02]' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="font-hud text-xs text-gray-600 w-5 text-center">{index + 1}</div>
        <StatusDot status={player.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-hud text-sm tracking-wide text-gray-100">{player.username}</span>
            <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-yellow-400/80">RNK {player.rank}</span>
          </div>
          <div className="text-[10px] text-gray-600 font-mono-hud">{player.title}</div>
        </div>
        <div className="hidden sm:block"><RoleBadge role={player.role} /></div>
        <div className="text-right">
          <div className="font-hud text-sm neon-gold">LVL {player.level}</div>
          <div className="text-[10px] text-gray-600 font-mono-hud">{player.reputation.toLocaleString()} REP</div>
        </div>
        <div className="hidden md:block text-right w-20">
          <div className="text-xs text-gray-400 font-mono-hud">{formatTime(player.onlineToday)}</div>
          <div className="text-[10px] text-gray-600 font-mono-hud">сегодня</div>
        </div>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-gray-600" />
      </div>

      {expanded && (
        <div className="mx-4 mb-2 p-3 bg-black/30 border border-yellow-400/10 rounded-sm animate-scale-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <div className="text-[10px] text-gray-600 font-hud tracking-wider mb-1">ОНЛАЙН НЕДЕЛЯ</div>
              <div className="text-sm font-mono-hud text-gray-300">{formatTime(player.onlineWeek)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 font-hud tracking-wider mb-1">СТАТУС</div>
              <div className={`text-sm font-mono-hud ${player.status === 'online' ? 'neon-green' : player.status === 'afk' ? 'text-yellow-400' : 'text-gray-500'}`}>
                {STATUS_LABELS[player.status]}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 font-hud tracking-wider mb-1">ПРЕДУПРЕЖДЕНИЯ</div>
              <div className={`text-sm font-mono-hud ${player.warnings > 0 ? 'neon-red' : 'text-gray-500'}`}>
                {player.warnings > 0 ? `⚠ ${player.warnings}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 font-hud tracking-wider mb-1">XP</div>
              <div className="text-sm font-mono-hud text-gray-300">{player.xp.toLocaleString()} / {player.xpMax.toLocaleString()}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600 font-hud w-16">XP</span>
              <XPBar value={player.xp} max={player.xpMax} color="xp-bar" />
              <span className="text-[10px] font-mono-hud text-gray-500">{Math.round((player.xp / player.xpMax) * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600 font-hud w-16">REP</span>
              <XPBar value={player.reputation} max={10000} color="rep-bar" />
              <span className="text-[10px] font-mono-hud text-gray-500">{Math.round((player.reputation / 10000) * 100)}%</span>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
              <button
                onClick={e => { e.stopPropagation(); onAddWarning?.(player.id); }}
                className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-sm hover:bg-red-500/20 transition-all"
              >
                + ПРЕДУПРЕЖДЕНИЕ
              </button>
              {player.warnings > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); onRemoveWarning?.(player.id); }}
                  className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-sm hover:bg-green-500/20 transition-all"
                >
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
    <div className="hud-panel stat-card p-4 animate-fade-in" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-hud tracking-widest text-gray-500 uppercase">{label}</span>
        <Icon name={icon} size={14} className="text-yellow-400/60" />
      </div>
      <div className="font-hud text-2xl neon-gold">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1 font-mono-hud">{sub}</div>}
    </div>
  );
}

// ─── ADD USER FORM ───────────────────────────────────────────
function AddUserForm({ viewerRole, currentUsername, onAdded }: {
  viewerRole: Role;
  currentUsername: string;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({ username: "", password: "", role: "user", title: "Новобранец", rank: "I" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) { setMsg({ text: "Заполните ник и пароль", ok: false }); return; }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(API_USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_user", ...form, created_by: currentUsername }),
      });
      const data = await res.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed.ok) {
        setMsg({ text: `Участник ${form.username} добавлен!`, ok: true });
        setForm({ username: "", password: "", role: "user", title: "Новобранец", rank: "I" });
        onAdded();
      } else {
        setMsg({ text: parsed.error || "Ошибка", ok: false });
      }
    } catch {
      setMsg({ text: "Нет связи с сервером", ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hud-panel p-5">
      <div className="font-hud text-xs tracking-widest text-gray-400 mb-4 flex items-center gap-2">
        <Icon name="UserPlus" size={12} />
        ДОБАВИТЬ УЧАСТНИКА
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-hud tracking-widest text-gray-600 mb-1.5">НИК</div>
            <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 text-gray-200 text-sm px-3 py-2 rounded-sm font-mono-hud focus:outline-none focus:border-yellow-400/40 placeholder:text-gray-700"
              placeholder="Имя_игрока" />
          </div>
          <div>
            <div className="text-[10px] font-hud tracking-widest text-gray-600 mb-1.5">ПАРОЛЬ</div>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 text-gray-200 text-sm px-3 py-2 rounded-sm font-mono-hud focus:outline-none focus:border-yellow-400/40 placeholder:text-gray-700"
              placeholder="••••••••" />
          </div>
          <div>
            <div className="text-[10px] font-hud tracking-widest text-gray-600 mb-1.5">ЗВАНИЕ</div>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 text-gray-200 text-sm px-3 py-2 rounded-sm font-mono-hud focus:outline-none focus:border-yellow-400/40"
              placeholder="Рядовой" />
          </div>
          <div>
            <div className="text-[10px] font-hud tracking-widest text-gray-600 mb-1.5">РАНГ</div>
            <select value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 text-gray-200 text-sm px-3 py-2 rounded-sm font-mono-hud focus:outline-none focus:border-yellow-400/40">
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <div className="text-[10px] font-hud tracking-widest text-gray-600 mb-1.5">РОЛЬ</div>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 text-gray-200 text-sm px-3 py-2 rounded-sm font-mono-hud focus:outline-none focus:border-yellow-400/40">
              <option value="user">ИГРОК</option>
              <option value="leader">ЛИДЕР</option>
              {(viewerRole === "admin" || viewerRole === "curator") && <option value="admin">АДМИНИСТРАТОР</option>}
              {viewerRole === "curator" && <option value="curator">КУРАТОР</option>}
            </select>
          </div>
        </div>

        {msg && (
          <div className={`text-xs font-mono-hud px-3 py-2 rounded-sm border flex items-center gap-2 ${msg.ok ? 'text-green-400 border-green-400/20 bg-green-400/5' : 'text-red-400 border-red-400/20 bg-red-400/5'}`}>
            <Icon name={msg.ok ? "CheckCircle" : "AlertCircle"} size={12} />
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="btn-hud text-[11px] font-hud tracking-widest px-6 py-2.5 bg-yellow-400 text-black rounded-sm hover:bg-yellow-300 disabled:opacity-50 transition-all">
          {loading ? "ДОБАВЛЕНИЕ..." : "ДОБАВИТЬ В ОРГАНИЗАЦИЮ"}
        </button>
      </form>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function Index() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [myStatus, setMyStatus] = useState<Status>("online");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const fetchPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      const res = await fetch(API_USERS);
      const data = await res.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed.users) setPlayers(parsed.users);
    } catch {
      // silent
    } finally {
      setLoadingPlayers(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchPlayers();
  }, [authUser, fetchPlayers]);

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    setMyStatus(user.status as Status);
  };

  const handleLogout = () => {
    setAuthUser(null);
    setPlayers([]);
    setActiveTab("stats");
  };

  const handleStatusChange = async (status: Status) => {
    setMyStatus(status);
    if (!authUser) return;
    try {
      await fetch(API_USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", user_id: authUser.id, status }),
      });
    } catch { /* silent */ }
  };

  const handleAddWarning = async (userId: number) => {
    await fetch(API_USERS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_warning", user_id: userId }),
    });
    fetchPlayers();
  };

  const handleRemoveWarning = async (userId: number) => {
    await fetch(API_USERS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_warning", user_id: userId }),
    });
    fetchPlayers();
  };

  if (!authUser) return <LoginScreen onLogin={handleLogin} />;

  const viewerRole = authUser.role as Role;
  const canAccessAdmin = viewerRole === "admin" || viewerRole === "curator";
  const canManageUsers = viewerRole === "admin" || viewerRole === "curator" || viewerRole === "leader";
  const canSeeFullStats = viewerRole === "curator";

  const TABS: { id: Tab; label: string; icon: string; visible: boolean }[] = [
    { id: "stats", label: "СТАТИСТИКА", icon: "Activity", visible: true },
    { id: "leaderboard", label: "РЕЙТИНГ", icon: "Trophy", visible: true },
    { id: "users", label: "УЧАСТНИКИ", icon: "Users", visible: canManageUsers },
    { id: "moderation", label: "МОДЕРАЦИЯ", icon: "Shield", visible: canManageUsers },
    { id: "admin_panel", label: "ПАНЕЛЬ АДМН", icon: "Settings", visible: canAccessAdmin },
  ].filter(t => t.visible);

  const onlinePlayers = players.filter(p => p.status === "online").length;
  const afkPlayers = players.filter(p => p.status === "afk").length;
  const totalOnlineToday = players.reduce((s, p) => s + p.onlineToday, 0);
  const sorted = [...players].sort((a, b) => b.reputation - a.reputation);
  const myRank = sorted.findIndex(p => p.id === authUser.id) + 1;

  return (
    <div className="hud-scanlines min-h-screen bg-[#070a10] text-gray-200 font-body">

      {/* Top HUD bar */}
      <div className="border-b border-yellow-400/20 bg-black/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 flex items-center justify-center rounded-sm"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)' }}>
              <Icon name="Zap" size={14} className="text-black" />
            </div>
            <div>
              <div className="font-hud text-sm tracking-widest text-yellow-400 leading-none">АФК ЖУРНАЛ</div>
              <div className="font-mono-hud text-[9px] text-gray-600 tracking-widest">GTA ACTIVITY HUB v2.0</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 dot-online" />
              <span className="font-mono-hud text-xs text-gray-400">{onlinePlayers} онлайн</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 dot-afk" />
              <span className="font-mono-hud text-xs text-gray-400">{afkPlayers} АФК</span>
            </div>
            <div className="font-mono-hud text-xs text-gray-600">
              {new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="font-hud text-xs tracking-wide text-gray-200">{authUser.username}</div>
              <RoleBadge role={viewerRole} />
            </div>
            <button onClick={handleLogout}
              className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center hover:border-red-400/40 hover:bg-red-400/10 transition-all group"
              title="Выйти">
              <Icon name="LogOut" size={14} className="text-gray-600 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* My profile card */}
        <div className="hud-panel p-4 mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div className="w-14 h-14 rounded-sm bg-gradient-to-br from-yellow-400/20 to-transparent border border-yellow-400/40 flex items-center justify-center">
                  <Icon name="User" size={24} className="text-yellow-400" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-black ${STATUS_COLORS[myStatus]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-hud text-lg tracking-wider text-yellow-400">{authUser.username}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="rank-badge text-[10px] font-hud px-2 py-0.5 text-yellow-400/80">РАНГ {authUser.rank}</span>
                  <span className="text-xs text-gray-500 font-mono-hud">{authUser.title}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 max-w-xs">
                  <XPBar value={authUser.xp} max={authUser.xpMax} color="xp-bar" />
                  <span className="text-[10px] font-mono-hud text-gray-500 whitespace-nowrap">LVL {authUser.level}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-hud tracking-widest text-gray-600 mb-1">МОЙ СТАТУС</div>
              <div className="flex gap-2">
                {(["online", "afk", "offline"] as Status[]).map(s => (
                  <button key={s} onClick={() => handleStatusChange(s)}
                    className={`btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 rounded-sm border transition-all ${
                      myStatus === s
                        ? s === 'online' ? 'bg-green-400/20 border-green-400/50 text-green-400'
                          : s === 'afk' ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400'
                          : 'bg-gray-600/20 border-gray-600/50 text-gray-400'
                        : 'bg-transparent border-white/10 text-gray-600 hover:border-white/20 hover:text-gray-400'
                    }`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex gap-0 mb-6 border-b border-yellow-400/10 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-hud tracking-widest whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-yellow-400 border-yellow-400 bg-yellow-400/5'
                  : 'text-gray-600 border-transparent hover:text-gray-400 hover:bg-white/[0.02]'
              }`}>
              <Icon name={tab.icon} size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── STATISTICS ─── */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Онлайн сегодня" value={formatTime(authUser.onlineToday)} icon="Clock" sub="личная статистика" delay={0} />
              <StatCard label="Онлайн за неделю" value={formatTime(authUser.onlineWeek)} icon="Calendar" sub="7 дней" delay={80} />
              <StatCard label="Репутация" value={authUser.reputation.toLocaleString()} icon="Star" sub={myRank > 0 ? `ТОП ${myRank} из ${players.length}` : '—'} delay={160} />
              <StatCard label="Уровень" value={`LVL ${authUser.level}`} icon="TrendingUp" sub={`${authUser.xp}/${authUser.xpMax} XP`} delay={240} />
            </div>

            <div className="hud-panel p-5 animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-hud text-sm tracking-widest text-gray-400">АКТИВНОСТЬ ЗА НЕДЕЛЮ</div>
                <span className="font-mono-hud text-[10px] text-gray-600">часы в сети</span>
              </div>
              <div className="flex items-end gap-2 h-24">
                {[2.1, 3.4, 1.8, 4.2, 3.1, 2.8, 3.7].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm relative overflow-hidden" style={{ height: `${(val / 5) * 80}px` }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/60 to-yellow-400/20 border border-yellow-400/30" />
                    </div>
                    <span className="font-mono-hud text-[9px] text-gray-600">
                      {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hud-panel p-5 animate-fade-in" style={{ animationDelay: '380ms', animationFillMode: 'both' }}>
              <div className="font-hud text-sm tracking-widest text-gray-400 mb-4">СИСТЕМА РЕПУТАЦИИ</div>
              <div className="space-y-3">
                {[
                  { label: "Боевая репутация", val: 78, color: "xp-bar" },
                  { label: "Социальная репутация", val: 52, color: "rep-bar" },
                  { label: "Рейтинг надёжности", val: 91, color: "xp-bar" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-hud text-gray-500 w-44">{item.label}</span>
                    <div className="flex-1"><XPBar value={item.val} max={100} color={item.color} /></div>
                    <span className="font-mono-hud text-xs text-gray-400 w-8 text-right">{item.val}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── LEADERBOARD ─── */}
        {activeTab === "leaderboard" && (
          <div className="hud-panel overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-yellow-400/10 flex items-center justify-between">
              <div className="font-hud text-sm tracking-widest text-gray-400">
                ТАБЛИЦА ЛИДЕРОВ <span className="text-yellow-400/40 ml-2">— ПО РЕПУТАЦИИ</span>
              </div>
              {canSeeFullStats && (
                <span className="text-[10px] font-hud text-orange-400 border border-orange-400/30 px-2 py-0.5 rounded-sm">КУРАТОР: ПОЛНАЯ СТАТИСТИКА</span>
              )}
            </div>
            {loadingPlayers ? (
              <div className="p-8 text-center font-mono-hud text-xs text-gray-600">ЗАГРУЗКА ДАННЫХ...</div>
            ) : (
              <div className="divide-y divide-white/5">
                {sorted.map((player, i) => (
                  <PlayerRow key={player.id} player={player} index={i} canEdit={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── USERS ─── */}
        {activeTab === "users" && canManageUsers && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="font-hud text-sm tracking-widest text-gray-400">СПИСОК УЧАСТНИКОВ</div>
              <button onClick={fetchPlayers}
                className="btn-hud flex items-center gap-2 text-[11px] font-hud tracking-wider px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-sm hover:border-yellow-400/30 hover:text-yellow-400 transition-all">
                <Icon name="RefreshCw" size={11} />
                ОБНОВИТЬ
              </button>
            </div>
            <div className="hud-panel overflow-hidden">
              <div className="divide-y divide-white/5">
                {players.map((player, i) => (
                  <PlayerRow key={player.id} player={player} index={i} canEdit={true}
                    onAddWarning={handleAddWarning} onRemoveWarning={handleRemoveWarning} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── MODERATION ─── */}
        {activeTab === "moderation" && canManageUsers && (
          <div className="space-y-4 animate-fade-in">
            <div className="font-hud text-sm tracking-widest text-gray-400">ПАНЕЛЬ МОДЕРАЦИИ</div>
            <div className="hud-panel p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-yellow-400/10">
                <div className="font-hud text-xs tracking-widest text-red-400">АКТИВНЫЕ ПРЕДУПРЕЖДЕНИЯ</div>
              </div>
              {players.filter(p => p.warnings > 0).length === 0 ? (
                <div className="p-6 text-center font-mono-hud text-xs text-gray-600">Нарушений не зафиксировано</div>
              ) : players.filter(p => p.warnings > 0).map((player) => (
                <div key={player.id} className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0">
                  <StatusDot status={player.status} />
                  <div className="flex-1">
                    <div className="font-hud text-sm text-gray-200">{player.username}</div>
                    <div className="text-[10px] text-gray-600 font-mono-hud">{player.title}</div>
                  </div>
                  <RoleBadge role={player.role} />
                  <div className="font-mono-hud text-sm neon-red">⚠ {player.warnings}</div>
                  <button onClick={() => handleRemoveWarning(player.id)}
                    className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-sm hover:bg-green-500/20 transition-all">
                    СНЯТЬ
                  </button>
                </div>
              ))}
            </div>

            {players.filter(p => p.status === 'afk').length > 0 && (
              <div className="hud-panel p-4 border-yellow-400/30">
                <div className="flex items-start gap-3">
                  <Icon name="AlertTriangle" size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-hud text-xs tracking-widest text-yellow-400 mb-1">АФК НАРУШИТЕЛИ</div>
                    <div className="text-xs text-gray-500">
                      {players.filter(p => p.status === 'afk').map(p => p.username).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ADMIN PANEL ─── */}
        {activeTab === "admin_panel" && canAccessAdmin && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="font-hud text-sm tracking-widest text-gray-400">ПАНЕЛЬ АДМИНИСТРАТОРА</div>
              <RoleBadge role={viewerRole} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="hud-panel p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-yellow-400/10 flex items-center gap-2">
                  <Icon name="Activity" size={12} className="text-cyan-400" />
                  <div className="font-hud text-xs tracking-widest text-cyan-400">ОНЛАЙН АДМИНИСТРАЦИИ</div>
                </div>
                <div className="p-4 space-y-3">
                  {players.filter(p => p.role === 'admin' || p.role === 'curator').map(player => (
                    <div key={player.id} className="flex items-center gap-3">
                      <StatusDot status={player.status} />
                      <div className="flex-1">
                        <div className="text-xs font-hud text-gray-300">{player.username}</div>
                        <div className="text-[10px] text-gray-600 font-mono-hud">Сегодня: {formatTime(player.onlineToday)}</div>
                      </div>
                      <RoleBadge role={player.role} />
                    </div>
                  ))}
                </div>
              </div>

              <div className={`hud-panel p-0 overflow-hidden ${!canSeeFullStats ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="px-4 py-3 border-b border-yellow-400/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="BarChart3" size={12} className="text-orange-400" />
                    <div className="font-hud text-xs tracking-widest text-orange-400">СТАТИСТИКА АФК</div>
                  </div>
                  {!canSeeFullStats && (
                    <div className="flex items-center gap-1 text-[10px] font-hud text-gray-600">
                      <Icon name="Lock" size={10} />
                      ТОЛЬКО КУРАТОР
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { label: "Общий онлайн сегодня", val: formatTime(totalOnlineToday), icon: "Clock" },
                    { label: "Участников онлайн", val: `${onlinePlayers} / ${players.length}`, icon: "Users" },
                    { label: "АФК нарушений", val: `${players.filter(p => p.warnings > 0).length}`, icon: "AlertTriangle" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Icon name={item.icon} size={11} className="text-gray-600" />
                        {item.label}
                      </div>
                      <span className="font-mono-hud text-xs neon-gold">{item.val}</span>
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
      <div className="border-t border-yellow-400/10 mt-8 py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-mono-hud text-[10px] text-gray-700 tracking-widest">GTA ACTIVITY HUB · {new Date().toLocaleDateString('ru')}</div>
          <div className="font-mono-hud text-[10px] text-gray-700">УЧАСТНИКОВ: {players.length} · ОНЛАЙН: {onlinePlayers}</div>
        </div>
      </div>
    </div>
  );
}
