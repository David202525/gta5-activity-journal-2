import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import LoginScreen from "@/components/LoginScreen";
import PlayerRow, { RoleBadge, StatCard, StatusDot, XPBar } from "@/components/shared/PlayerRow";
import WeekActivityChart from "@/components/shared/WeekActivityChart";
import {
  API_USERS, MOCK_USERS, apiPost, apiGet,
  AuthUser, Player, Role, Status, Tab,
  STATUS_COLORS, STATUS_LABELS, formatTime,
} from "@/lib/types";

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
      setPlayers(MOCK_USERS.map(({ password: _p, token: _t, ...u }) => { void _p; void _t; return u; }));
      setIsMock(true);
    }
    finally { setLoadingPlayers(false); }
  }, []);

  useEffect(() => { if (authUser) fetchPlayers(); }, [authUser, fetchPlayers]);

  // Heartbeat: каждые 60 сек посылаем set_status=online — бэкенд начисляет минуты
  useEffect(() => {
    if (!authUser || myStatus !== "online") return;
    const tick = setInterval(async () => {
      try { await apiPost(API_USERS, { action: "set_status", user_id: authUser.id, status: "online" }); }
      catch { /* мок-режим */ }
    }, 60_000);
    return () => clearInterval(tick);
  }, [authUser, myStatus]);

  // При закрытии вкладки — ставим offline
  useEffect(() => {
    if (!authUser) return;
    const onUnload = () => {
      navigator.sendBeacon(API_USERS, JSON.stringify({ action: "set_status", user_id: authUser.id, status: "offline" }));
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [authUser]);

  const handleLogin = (user: AuthUser) => { setAuthUser(user); setMyStatus(user.status as Status); };
  const handleLogout = () => {
    if (authUser) {
      apiPost(API_USERS, { action: "set_status", user_id: authUser.id, status: "offline" }).catch(() => {});
    }
    setAuthUser(null); setPlayers([]); setActiveTab("stats"); setIsMock(false);
  };

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

  const handleEditPlayer = async (userId: number, fields: { username?: string; rank?: string }) => {
    setPlayers(p => p.map(u => u.id === userId ? { ...u, ...fields } : u));
    try { await apiPost(API_USERS, { action: "edit_user", user_id: userId, ...fields }); }
    catch { /* мок: уже обновили локально */ }
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

            <div className="flex flex-col items-start sm:items-end gap-2">
              <RoleBadge role={viewerRole} />
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
            <WeekActivityChart weekActivity={authUser.weekActivity} />


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
                  onAddWarning={handleAddWarning} onRemoveWarning={handleRemoveWarning}
                  onEditPlayer={handleEditPlayer} />
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
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-800/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="Clock" size={13} className="text-amber-400" />
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