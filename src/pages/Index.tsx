import { useState, useEffect, useRef } from "react";
import LoginScreen from "@/components/LoginScreen";
import VkBindScreen from "@/components/VkBindScreen";
import AppHeader from "@/components/hud/AppHeader";
import { ProfileCard, TabBar } from "@/components/hud/ProfileCard";
import TabContent from "@/components/hud/TabContent";
import {
  MOCK_TABLE_ORG, MOCK_TABLE_ADMIN,
  AuthUser, Player, Organization, Notification, TableSheet, Order, Role, Status, Tab, isCuratorRole,
  issuePenaltyToList,
} from "@/lib/types";
import {
  apiGetPlayers, apiSetStatus, apiEditPlayer, apiAddOnline,
  apiGetOrders, apiAddOrder, apiDeleteOrder, apiNotifyVkStatus,
  apiGetOrgs, apiCreateOrg, apiUpdateOrg, apiDeleteOrg,
  apiGetTables, apiUpdateTable,
} from "@/lib/api";

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
  const authUserRef = useRef(authUser);
  const myStatusRef = useRef(myStatus);
  useEffect(() => { authUserRef.current = authUser; }, [authUser]);
  useEffect(() => { myStatusRef.current = myStatus; }, [myStatus]);
  const [players, setPlayers]             = useState<Player[]>([]);
  const [orgs, setOrgs]                   = useState<Organization[]>([]);
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
      // Синхронизируем статус из сервера — используем ref чтобы всегда брать актуальное значение
      const curUser = authUserRef.current;
      const curStatus = myStatusRef.current;
      if (curUser) {
        const fresh = list.find(p => p.id === curUser.id);
        if (fresh && fresh.status !== curStatus) {
          setMyStatus(fresh.status as Status);
          const updated = { ...curUser, ...fresh, token: curUser.token };
          setAuthUser(updated);
          saveSession(updated);
        }
      }
    } catch { /* сервер недоступен */ }
  };

  // ── Загрузка приказов с сервера ──────────────────────────────
  const fetchOrders = async () => {
    try { const list = await apiGetOrders(); setOrders(list); } catch (e) { /* offline */ }
  };

  const fetchOrgs = async () => {
    try { const list = await apiGetOrgs(); setOrgs(list); } catch (e) { /* offline */ }
  };

  const fetchTables = async () => {
    try {
      const t = await apiGetTables();
      if (t.org)   setOrgTable(t.org);
      if (t.admin) setAdminTable(t.admin);
    } catch (e) { /* offline */ }
  };

  useEffect(() => { if (authUser) { fetchPlayers(); fetchOrders(); fetchOrgs(); fetchTables(); } }, [authUser]);

  // ── Опрос каждые 10 сек ───────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    const poll = setInterval(() => { fetchPlayers(); fetchOrders(); fetchOrgs(); }, 4_000);
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
    await apiNotifyVkStatus(authUser.id, status).catch(() => {});
    const updated = { ...authUser, status };
    setAuthUser(updated);
    saveSession(updated);
    fetchPlayers();
  };

  // ── Предупреждения / взыскания ────────────────────────────────
  const handleAddWarning = async (userId: number, reason: string) => {
    const player = players.find(u => u.id === userId);
    if (!player) return;
    const { newPenalties } = issuePenaltyToList(
      player.penalties,
      reason || "Без причины",
      authUser?.username ?? "Система",
    );
    await apiEditPlayer(userId, { warnings: player.warnings + 1, penalties: newPenalties }).catch(() => {});
    fetchPlayers();
  };

  const handleRemoveWarning = async (userId: number) => {
    const player = players.find(u => u.id === userId);
    if (!player) return;
    const updatedPenalties = [...player.penalties];
    const lastActive = [...updatedPenalties].reverse().find(p => p.isActive);
    if (lastActive) lastActive.isActive = false;
    await apiEditPlayer(userId, { warnings: Math.max(0, player.warnings - 1), penalties: updatedPenalties }).catch(() => {});
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
  const handleUpdateOrg = async (updated: Organization) => {
    const prev = orgs.find(o => o.id === updated.id);
    setOrgs(prevOrgs => prevOrgs.map(o => o.id === updated.id ? updated : o));
    await apiUpdateOrg(updated.id, updated).catch(() => {});

    // Синхронизируем org_id участников: добавленным ставим orgId, удалённым сбрасываем
    if (prev) {
      const added   = updated.memberIds.filter(id => !prev.memberIds.includes(id));
      const removed = prev.memberIds.filter(id => !updated.memberIds.includes(id));
      await Promise.all([
        ...added.map(id => apiEditPlayer(id, { orgId: updated.id } as Partial<Player>).catch(() => {})),
        ...removed.map(id => apiEditPlayer(id, { orgId: null } as Partial<Player>).catch(() => {})),
      ]);
    }
  };

  const handleOrgCreated = async (org: Organization) => {
    try {
      const created = await apiCreateOrg(org);
      setOrgs(prev => [created, ...prev]);
    } catch (e) { /* offline */ }
  };

  const handleDeleteOrg = async (id: number) => {
    setOrgs(prev => prev.filter(o => o.id !== id));
    await apiDeleteOrg(id).catch(() => {});
  };

  // ── Смена роли ────────────────────────────────────────────────
  const handleRoleChange = async (userId: number, role: Role) => {
    await apiEditPlayer(userId, { role }).catch(() => {});
    fetchPlayers();
  };

  // ── Смена пароля куратором ────────────────────────────────────
  const handleChangePassword = async (userId: number, newPassword: string) => {
    await apiEditPlayer(userId, { password: newPassword } as Partial<Player>).catch(() => {});
  };

  // ── Экран входа ───────────────────────────────────────────────
  if (!authUser) return <LoginScreen onLogin={handleLogin} />;

  // ── Экран привязки VK (если vk_id не привязан) ───────────────
  const needVkBind = !(authUser as AuthUser & { vk_id?: number | null }).vk_id;
  if (needVkBind) {
    return (
      <VkBindScreen
        authUser={authUser}
        onBound={(updated) => { saveSession(updated); setAuthUser(updated); setMyStatus(updated.status as Status); }}
        onLogout={handleLogout}
      />
    );
  }

  // ── Производные данные ────────────────────────────────────────
  const viewerRole      = authUser.role as Role;
  const canAccessAdmin  = viewerRole === "admin" || isCuratorRole(viewerRole);
  const canManageUsers  = viewerRole === "admin" || isCuratorRole(viewerRole) || viewerRole === "leader" || viewerRole === "deputy";
  const canSeeFullStats = isCuratorRole(viewerRole);

  // Ищем организацию текущего пользователя: по orgId из профиля, leaderId, или по членству
  const freshMe = players.find(p => p.id === authUser.id);
  const myOrgId = freshMe?.orgId ?? authUser.orgId;
  const myOrg = orgs.find(o =>
    (myOrgId && o.id === myOrgId) ||
    o.leaderId === authUser.id ||
    o.memberIds.includes(authUser.id)
  ) ?? null;

  // curator        — главный куратор: всё
  // curator_admin   — куратор администрации: только Таблицы(адм) + Панель, без Приказной и Организаций
  // curator_faction — куратор фракций: Приказная + Организации + Таблицы(орг) + Панель
  const canSeeTables  = viewerRole === "curator" || viewerRole === "curator_admin" || viewerRole === "curator_faction" || viewerRole === "admin" || viewerRole === "leader" || viewerRole === "deputy";
  // user в организации видит Приказную и Организации
  const isOrgMember   = viewerRole === "user" && !!myOrg;
  const canSeeOrders  = viewerRole === "leader" || viewerRole === "deputy" || viewerRole === "curator" || viewerRole === "curator_faction" || isOrgMember;
  const canSeeOrgs    = viewerRole === "curator" || viewerRole === "curator_faction" || viewerRole === "leader" || viewerRole === "deputy" || isOrgMember;

  const TABS: { id: Tab; label: string; icon: string; visible: boolean }[] = [
    { id: "stats",         label: "Статистика",  icon: "Activity",   visible: true },
    { id: "leaderboard",   label: "Рейтинг",     icon: "Trophy",     visible: true },
    { id: "users",         label: "Участники",   icon: "Users",      visible: canManageUsers },
    { id: "moderation",    label: "Модерация",   icon: "Shield",     visible: canManageUsers },
    { id: "tables",        label: "Таблицы",     icon: "Table2",     visible: canSeeTables },
    { id: "orders",        label: "Приказная",   icon: "ScrollText", visible: canSeeOrders },
    { id: "organizations", label: "Организации", icon: "Building2",  visible: canSeeOrgs },
    { id: "admin_panel",   label: "Панель",      icon: "Settings",   visible: canAccessAdmin },
  ].filter(t => t.visible);

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setSelectedOrgId(null); };

  // Фильтр видимости игроков по роли текущего пользователя
  const ADMIN_ROLES   = ["admin", "curator", "curator_admin", "curator_faction"];
  const FACTION_ROLES = ["user", "leader", "deputy"];
  const visiblePlayers = players.filter(p => {
    if (viewerRole === "curator") return true;
    if (viewerRole === "curator_admin") return ADMIN_ROLES.includes(p.role);
    if (viewerRole === "curator_faction") return FACTION_ROLES.includes(p.role) || p.role === "curator_faction" || p.role === "curator";
    if (viewerRole === "admin") return ADMIN_ROLES.includes(p.role);
    // leader, deputy — все фракционные
    if (viewerRole === "leader" || viewerRole === "deputy") return FACTION_ROLES.includes(p.role);
    // user в организации — видит только участников своей организации
    if (viewerRole === "user" && myOrg) return myOrg.memberIds.includes(p.id) || p.id === authUser.id;
    // user без организации — только себя
    return p.id === authUser.id;
  });

  const onlinePlayers    = visiblePlayers.filter(p => p.status === "online").length;
  const afkPlayers       = visiblePlayers.filter(p => p.status === "afk").length;
  const totalOnlineToday = visiblePlayers.reduce((s, p) => s + p.onlineToday, 0);
  const sorted           = [...visiblePlayers].sort((a, b) => b.reputation - a.reputation);
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
          authUser={{ ...authUser, ...(players.find(p => p.id === authUser.id) ?? {}) } as AuthUser}
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
          players={visiblePlayers}
          allPlayers={players}
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
          onOrgCreated={handleOrgCreated}
          onDeleteOrg={handleDeleteOrg}
          onRoleChange={handleRoleChange}
          onChangePassword={handleChangePassword}
          onStatusChange={async (id, status) => { await apiSetStatus(id, status).catch(() => {}); fetchPlayers(); }}
          orgTable={orgTable}
          adminTable={adminTable}
          onOrgTableChange={async (t) => { setOrgTable(t); await apiUpdateTable("org", t).catch(() => {}); }}
          onAdminTableChange={async (t) => { setAdminTable(t); await apiUpdateTable("admin", t).catch(() => {}); }}
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