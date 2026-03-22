import { useState, useEffect } from "react";
import LoginScreen from "@/components/LoginScreen";
import AppHeader from "@/components/hud/AppHeader";
import { ProfileCard, TabBar } from "@/components/hud/ProfileCard";
import TabContent from "@/components/hud/TabContent";
import {
  MOCK_ORGS, MOCK_TABLE_ORG, MOCK_TABLE_ADMIN,
  AuthUser, Player, Organization, Notification, TableSheet, Order, Role, Status, Tab, isCuratorRole,
} from "@/lib/types";
import { apiGetPlayers, apiSetStatus, apiEditPlayer, apiAddOnline, apiGetOrders, apiAddOrder, apiDeleteOrder } from "@/lib/api";

// ── Сессия (15 минут) ────────────────────────────────────────
const SESSION_KEY = "hud_session";
const SESSION_TTL = 15 * 60 * 1000;

function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { user, savedAt } = JSON.parse(raw) as { user: AuthUser; savedAt: number };
    if (Date.now() - savedAt > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return null; }
    return user;
  } catch { return null; }
}

function saveSession(user: AuthUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, savedAt: Date.now() }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export default function Index() {
  const [authUser, setAuthUser]           = useState<AuthUser | null>(() => loadSession());
  const [activeTab, setActiveTab]         = useState<Tab>("stats");
  const [myStatus, setMyStatus]           = useState<Status>(() => loadSession()?.status as Status ?? "offline");
  const [players, setPlayers]             = useState<Player[]>([]);
  const [orgs, setOrgs]                   = useState<Organization[]>(MOCK_ORGS);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [orgTable, setOrgTable]           = useState<TableSheet>(MOCK_TABLE_ORG);
  const [adminTable, setAdminTable]       = useState<TableSheet>(MOCK_TABLE_ADMIN);
  const [orders, setOrders]               = useState<Order[]>([]);

  // ── Уведомления ──────────────────────────────────────────────
  const addNotification = (note: Omit<Notification, "id" | "read">) => {
    setNotifications(prev => [{ ...note, id: Date.now(), read: false }, ...prev]);
    setShowNotifications(true);
  };

  // ── Загрузка игроков с сервера ───────────────────────────────
  const fetchPlayers = async () => {
    try {
      const list = await apiGetPlayers();
      setPlayers(list);
    } catch { /* сервер недоступен */ }
  };

  // ── Загрузка приказов с сервера ──────────────────────────────
  const fetchOrders = async () => {
    try {
      const list = await apiGetOrders();
      setOrders(list);
    } catch { /* сервер недоступен */ }
  };

  useEffect(() => { if (authUser) { fetchPlayers(); fetchOrders(); } }, [authUser]);

  // ── Опрос каждые 10 сек ───────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    const poll = setInterval(() => { fetchPlayers(); fetchOrders(); }, 10_000);
    return () => clearInterval(poll);
  }, [authUser]);

  // ── Heartbeat: каждую минуту прибавляем 1 мин онлайна ────────
  useEffect(() => {
    if (!authUser || myStatus !== "online") return;
    const tick = setInterval(async () => {
      await apiAddOnline(authUser.id, 1).catch(() => {});
      fetchPlayers();
    }, 60_000);
    return () => clearInterval(tick);
  }, [authUser, myStatus]);

  // ── Закрытие вкладки — статус НЕ меняем, игрок сам управляет ─

  // ── Auth handlers ─────────────────────────────────────────────
  const handleLogin = (user: AuthUser) => {
    saveSession(user);
    setAuthUser(user);
    setMyStatus(user.status as Status);
  };

  const handleLogout = () => {
    clearSession();
    setAuthUser(null); setPlayers([]); setActiveTab("stats");
  };

  // ── Смена статуса ─────────────────────────────────────────────
  const handleStatusChange = async (status: Status) => {
    setMyStatus(status);
    if (!authUser) return;
    await apiSetStatus(authUser.id, status).catch(() => {});
    const updated = { ...authUser, status };
    setAuthUser(updated);
    saveSession(updated);
    fetchPlayers();
  };

  // ── Предупреждения ────────────────────────────────────────────
  const handleAddWarning = async (userId: number) => {
    const player = players.find(u => u.id === userId);
    if (!player) return;
    await apiEditPlayer(userId, { warnings: player.warnings + 1 }).catch(() => {});
    fetchPlayers();
  };

  const handleRemoveWarning = async (userId: number) => {
    const player = players.find(u => u.id === userId);
    if (!player) return;
    await apiEditPlayer(userId, { warnings: Math.max(0, player.warnings - 1) }).catch(() => {});
    fetchPlayers();
  };

  // ── Редактирование игрока ─────────────────────────────────────
  const handleEditPlayer = async (userId: number, fields: { username?: string; rank?: string; title?: string }) => {
    await apiEditPlayer(userId, fields).catch(() => {});
    fetchPlayers();
  };

  const handleUpdatePlayer = async (id: number, fields: Partial<Player>) => {
    await apiEditPlayer(id, fields).catch(() => {});
    fetchPlayers();
  };

  // ── Организации ───────────────────────────────────────────────
  const handleUpdateOrg = (updated: Organization) =>
    setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o));

  // ── Смена роли ────────────────────────────────────────────────
  const handleRoleChange = async (userId: number, role: Role) => {
    await apiEditPlayer(userId, { role }).catch(() => {});
    fetchPlayers();
  };

  // ── Экран входа ───────────────────────────────────────────────
  if (!authUser) return <LoginScreen onLogin={handleLogin} />;

  // ── Производные данные ────────────────────────────────────────
  const viewerRole      = authUser.role as Role;
  const canAccessAdmin  = viewerRole === "admin" || isCuratorRole(viewerRole);
  const canManageUsers  = viewerRole === "admin" || isCuratorRole(viewerRole) || viewerRole === "leader" || viewerRole === "deputy";
  const canSeeFullStats = isCuratorRole(viewerRole);

  const myOrg = viewerRole === "leader"
    ? orgs.find(o => o.leaderId === authUser.id) ?? null
    : null;

  const canSeeTables = canManageUsers || viewerRole === "curator_admin";
  const canSeeOrders = viewerRole === "leader" || viewerRole === "deputy" || isCuratorRole(viewerRole);

  const TABS: { id: Tab; label: string; icon: string; visible: boolean }[] = [
    { id: "stats",         label: "Статистика",  icon: "Activity",   visible: true },
    { id: "leaderboard",   label: "Рейтинг",     icon: "Trophy",     visible: true },
    { id: "users",         label: "Участники",   icon: "Users",      visible: canManageUsers },
    { id: "moderation",    label: "Модерация",   icon: "Shield",     visible: canManageUsers },
    { id: "tables",        label: "Таблицы",     icon: "Table2",     visible: canSeeTables },
    { id: "orders",        label: "Приказная",   icon: "ScrollText", visible: canSeeOrders },
    { id: "organizations", label: "Организации", icon: "Building2",  visible: isCuratorRole(viewerRole) || viewerRole === "leader" },
    { id: "admin_panel",   label: "Панель",      icon: "Settings",   visible: canAccessAdmin },
  ].filter(t => t.visible);

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setSelectedOrgId(null); };

  const onlinePlayers    = players.filter(p => p.status === "online").length;
  const afkPlayers       = players.filter(p => p.status === "afk").length;
  const totalOnlineToday = players.reduce((s, p) => s + p.onlineToday, 0);
  const sorted           = [...players].sort((a, b) => b.reputation - a.reputation);
  const myRank           = sorted.findIndex(p => p.id === authUser.id) + 1;

  return (
    <div className="hud-scanlines min-h-screen bg-[#09060f] text-purple-100 font-body">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-800/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-900/12 rounded-full blur-3xl" />
      </div>

      <AppHeader
        authUser={authUser}
        viewerRole={viewerRole}
        players={players}
        orders={orders}
        onAddOrder={async order => { await apiAddOrder(order).catch(() => {}); fetchOrders(); }}
        onlinePlayers={onlinePlayers}
        afkPlayers={afkPlayers}
        isMock={false}
        notifications={notifications}
        showNotifications={showNotifications}
        onToggleNotifications={() => setShowNotifications(v => !v)}
        onMarkAllRead={() => { setNotifications(p => p.map(n => ({ ...n, read: true }))); setShowNotifications(false); }}
        onLogout={handleLogout}
        onNotify={addNotification}
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <ProfileCard
          authUser={authUser}
          viewerRole={viewerRole}
          myStatus={myStatus}
          onStatusChange={handleStatusChange}
        />

        <TabBar
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <TabContent
          activeTab={activeTab}
          authUser={authUser}
          myStatus={myStatus}
          viewerRole={viewerRole}
          players={players}
          orgs={orgs}
          selectedOrgId={selectedOrgId}
          loadingPlayers={false}
          myOrg={myOrg}
          canManageUsers={canManageUsers}
          canAccessAdmin={canAccessAdmin}
          canSeeFullStats={canSeeFullStats}
          onlinePlayers={onlinePlayers}
          afkPlayers={afkPlayers}
          totalOnlineToday={totalOnlineToday}
          sorted={sorted}
          myRank={myRank}
          onFetchPlayers={fetchPlayers}
          onAddWarning={handleAddWarning}
          onRemoveWarning={handleRemoveWarning}
          onEditPlayer={handleEditPlayer}
          onSetSelectedOrgId={setSelectedOrgId}
          onUpdateOrg={handleUpdateOrg}
          onUpdatePlayer={handleUpdatePlayer}
          onNotify={addNotification}
          onOrgCreated={org => setOrgs(prev => [org, ...prev])}
          onRoleChange={handleRoleChange}
          onStatusChange={async (id, status) => { await apiSetStatus(id, status).catch(() => {}); fetchPlayers(); }}
          orgTable={orgTable}
          adminTable={adminTable}
          onOrgTableChange={setOrgTable}
          onAdminTableChange={setAdminTable}
          orders={orders}
          onAddOrder={async order => { await apiAddOrder(order).catch(() => {}); fetchOrders(); }}
          onDeleteOrder={async id => { await apiDeleteOrder(id).catch(() => {}); fetchOrders(); }}
        />
      </div>

      <div className="border-t border-purple-900/30 mt-8 py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="font-mono-hud text-[10px] text-purple-900 tracking-widest">GTA ACTIVITY HUB · {new Date().toLocaleDateString("ru")}</div>
          <div className="font-mono-hud text-[10px] text-purple-900">УЧАСТНИКОВ: {players.length} · ОНЛАЙН: {onlinePlayers}</div>
        </div>
      </div>
    </div>
  );
}