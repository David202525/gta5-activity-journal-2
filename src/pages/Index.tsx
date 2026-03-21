import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import HudSelect from "@/components/ui/hud-select";
import LoginScreen from "@/components/LoginScreen";
import PlayerRow, { RoleBadge, StatCard, StatusDot, XPBar } from "@/components/shared/PlayerRow";
import WeekActivityChart from "@/components/shared/WeekActivityChart";
import OrgDetail from "@/components/shared/OrgDetail";
import {
  API_USERS, MOCK_USERS, MOCK_ORGS, apiPost, apiGet,
  AuthUser, Player, Organization, Notification, Role, Status, Tab,
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
            <HudSelect
              value={form.rank}
              onChange={v => setForm(p => ({ ...p, rank: v }))}
              options={["I","II","III","IV"].map(r => ({ value: r, label: r }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Роль</label>
            <HudSelect
              value={form.role}
              onChange={v => setForm(p => ({ ...p, role: v }))}
              options={[
                { value: "user",    label: "ИГРОК",          color: "text-zinc-300" },
                { value: "leader",  label: "ЛИДЕР",          color: "text-amber-400" },
                ...(viewerRole === "admin" || viewerRole === "curator"
                  ? [{ value: "admin", label: "АДМИНИСТРАТОР", color: "text-indigo-400" }] : []),
                ...(viewerRole === "curator"
                  ? [{ value: "curator", label: "КУРАТОР",     color: "text-pink-400"   }] : []),
              ]}
            />
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

// ─── CREATE ORG FORM ─────────────────────────────────────────
function CreateOrgForm({ players, onCreated }: { players: Player[]; onCreated: (org: Organization) => void }) {
  const [form, setForm] = useState({ name: "", tag: "", description: "", leaderId: "" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const leaders = players.filter(p => p.role === "leader" || p.role === "admin");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.tag.trim()) { setMsg({ text: "Название и тег обязательны", ok: false }); return; }
    const leader = leaders.find(l => l.id === Number(form.leaderId));
    const org: Organization = {
      id: Date.now(), name: form.name.trim(), tag: form.tag.trim(),
      description: form.description.trim(), leaderId: leader?.id ?? null,
      leaderName: leader?.username ?? "—", memberIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onCreated(org);
    setMsg({ text: `Организация «${org.name}» создана!`, ok: true });
    setForm({ name: "", tag: "", description: "", leaderId: "" });
  };

  const inputCls = "w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-2.5 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 bg-transparent focus:border-violet-600/50 transition-all";
  const labelCls = "text-[10px] font-hud tracking-widest text-purple-600 uppercase block mb-2";

  return (
    <div className="hud-panel p-6">
      <div className="font-hud text-xs tracking-widest text-purple-400/70 mb-5 flex items-center gap-2">
        <Icon name="Building2" size={13} className="text-violet-400" />
        СОЗДАТЬ ОРГАНИЗАЦИЮ
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Название</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Shadow Legion" />
          </div>
          <div>
            <label className={labelCls}>Тег</label>
            <input value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} className={inputCls} placeholder="[SL]" maxLength={8} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Описание</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputCls} placeholder="Краткое описание организации" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Лидер организации</label>
            <HudSelect
              value={form.leaderId}
              onChange={v => setForm(p => ({ ...p, leaderId: v }))}
              placeholder="— Без лидера —"
              options={[
                { value: "", label: "— Без лидера —", color: "text-purple-600" },
                ...leaders.map(l => ({
                  value: String(l.id),
                  label: `${l.username} (${l.role})`,
                  color: l.role === "admin" ? "text-indigo-400" : "text-amber-400",
                })),
              ]}
            />
          </div>
        </div>
        {msg && (
          <div className={`text-xs font-mono-hud px-4 py-2.5 rounded-lg border flex items-center gap-2 ${msg.ok ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8" : "text-red-400 border-red-500/20 bg-red-500/8"}`}>
            <Icon name={msg.ok ? "CheckCircle" : "AlertCircle"} size={12} />
            {msg.text}
          </div>
        )}
        <button type="submit"
          className="btn-hud font-hud text-[11px] tracking-widest px-6 py-3 text-white rounded-xl transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
          СОЗДАТЬ ОРГАНИЗАЦИЮ
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
  const [orgs, setOrgs] = useState<Organization[]>(MOCK_ORGS);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [isMock, setIsMock] = useState(false);

  const addNotification = (note: Omit<Notification, "id" | "read">) => {
    setNotifications(prev => [{ ...note, id: Date.now(), read: false }, ...prev]);
    setShowNotifications(true);
  };

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

  // Лидер видит свою организацию
  const myOrg = viewerRole === "leader"
    ? orgs.find(o => o.leaderId === authUser.id) ?? null
    : null;

  const TABS: { id: Tab; label: string; icon: string; visible: boolean }[] = [
    { id: "stats", label: "Статистика", icon: "Activity", visible: true },
    { id: "leaderboard", label: "Рейтинг", icon: "Trophy", visible: true },
    { id: "users", label: "Участники", icon: "Users", visible: canManageUsers },
    { id: "moderation", label: "Модерация", icon: "Shield", visible: canManageUsers },
    { id: "organizations", label: "Организации", icon: "Building2", visible: viewerRole === "curator" || viewerRole === "leader" },
    { id: "admin_panel", label: "Панель", icon: "Settings", visible: canAccessAdmin },
  ].filter(t => t.visible);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedOrgId(null);
  };

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

            {/* Колокол уведомлений */}
            {(viewerRole === "leader" || viewerRole === "admin" || viewerRole === "curator") && (
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)}
                  className="w-9 h-9 rounded-xl bg-white/4 border border-purple-900/60 flex items-center justify-center hover:border-violet-600/40 hover:bg-violet-900/20 transition-all relative">
                  <Icon name="Bell" size={14} className="text-purple-500" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center font-hud text-[9px] text-white">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {showNotifications && notifications.length > 0 && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#110d1e] border border-purple-700/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden z-50">
                    <div className="px-4 py-2.5 border-b border-purple-900/40 flex items-center justify-between">
                      <span className="font-hud text-xs tracking-widest text-purple-400">УВЕДОМЛЕНИЯ</span>
                      <button onClick={() => { setNotifications(p => p.map(n => ({ ...n, read: true }))); setShowNotifications(false); }}
                        className="text-[10px] font-mono-hud text-purple-700 hover:text-purple-400">прочитать все</button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-purple-900/20 last:border-0 ${!n.read ? "bg-purple-900/15" : ""}`}>
                          <div className="text-xs font-mono-hud text-purple-300 leading-relaxed">{n.text}</div>
                          <div className="text-[10px] text-purple-800 mt-1">
                            {new Date(n.timestamp).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
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
              {(viewerRole === "leader"
                // Лидер видит только участников своей организации
                ? players.filter(p => myOrg?.memberIds.includes(p.id))
                : players
              ).map((player, i) => (
                <PlayerRow key={player.id} player={player} index={i} canEdit={true}
                  viewerRole={viewerRole}
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

        {/* ── ORGANIZATIONS ── */}
        {activeTab === "organizations" && (viewerRole === "curator" || viewerRole === "leader") && (
          <div className="animate-fade-in">

            {/* LEADER VIEW: сразу открывает свою организацию */}
            {viewerRole === "leader" && (
              myOrg ? (
                <OrgDetail
                  org={myOrg}
                  allPlayers={players}
                  viewerRole={viewerRole}
                  viewerName={authUser.username}
                  viewerId={authUser.id}
                  onBack={() => {}}
                  onUpdate={updated => setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o))}
                  onPlayerUpdate={(id, fields) => setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p))}
                  onNotify={addNotification}
                />
              ) : (
                <div className="hud-panel p-10 text-center space-y-2">
                  <Icon name="Building2" size={28} className="text-purple-800 mx-auto" />
                  <div className="font-hud text-sm text-purple-700">Вы не назначены лидером ни одной организации</div>
                  <div className="font-mono-hud text-xs text-purple-900">Обратитесь к куратору для создания организации</div>
                </div>
              )
            )}

            {/* CURATOR VIEW: список + детальная страница */}
            {viewerRole === "curator" && (
              selectedOrgId !== null ? (
                <OrgDetail
                  org={orgs.find(o => o.id === selectedOrgId)!}
                  allPlayers={players}
                  viewerRole={viewerRole}
                  viewerName={authUser.username}
                  viewerId={authUser.id}
                  onBack={() => setSelectedOrgId(null)}
                  onUpdate={updated => setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o))}
                  onPlayerUpdate={(id, fields) => setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p))}
                  onNotify={addNotification}
                />
              ) : (
                <div className="space-y-4">
                  <div className="font-hud text-sm tracking-wider text-purple-400">ОРГАНИЗАЦИИ</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {orgs.map(org => {
                      const orgMembers = players.filter(p => org.memberIds.includes(p.id));
                      const onlineCnt = orgMembers.filter(p => p.status === "online").length;
                      return (
                        <div key={org.id}
                          className="hud-panel p-5 cursor-pointer hover:border-violet-700/40 transition-all group"
                          onClick={() => setSelectedOrgId(org.id)}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-hud text-base text-purple-100 group-hover:text-violet-200 transition-colors">{org.name}</span>
                                <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/80">{org.tag}</span>
                              </div>
                              <div className="text-[10px] text-purple-700 font-mono-hud mt-1">{org.description || "Нет описания"}</div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-violet-900/40 border border-violet-800/30 group-hover:border-violet-600/50 flex items-center justify-center flex-shrink-0 transition-all">
                              <Icon name="ChevronRight" size={15} className="text-violet-500 group-hover:text-violet-300 transition-colors" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 pt-3 border-t border-purple-900/30">
                            <div className="flex items-center gap-1.5">
                              <Icon name="Crown" size={11} className="text-amber-700" />
                              <span className="text-[10px] font-mono-hud text-purple-600">{org.leaderName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Icon name="Users" size={11} className="text-purple-700" />
                              <span className="text-[10px] font-mono-hud text-purple-600">{org.memberIds.length} уч.</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span className="text-[10px] font-mono-hud text-emerald-600">{onlineCnt} онлайн</span>
                            </div>
                            <span className="text-[10px] font-mono-hud text-purple-900 ml-auto">{org.createdAt}</span>
                          </div>
                        </div>
                      );
                    })}
                    {orgs.length === 0 && (
                      <div className="md:col-span-2 hud-panel p-10 text-center font-mono-hud text-xs text-purple-800">
                        Организаций пока нет
                      </div>
                    )}
                  </div>

                  <CreateOrgForm players={players} onCreated={org => setOrgs(prev => [org, ...prev])} />
                </div>
              )
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