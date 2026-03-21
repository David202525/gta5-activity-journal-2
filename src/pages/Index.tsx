import { useState, useEffect, useCallback } from "react";
import LoginScreen from "@/components/LoginScreen";
import AppHeader from "@/components/hud/AppHeader";
import { ProfileCard, TabBar } from "@/components/hud/ProfileCard";
import TabContent from "@/components/hud/TabContent";
import {
  API_USERS, MOCK_USERS, MOCK_ORGS, apiPost, apiGet,
  AuthUser, Player, Organization, Notification, Role, Status, Tab,
} from "@/lib/types";

export default function Index() {
  const [authUser, setAuthUser]               = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab]             = useState<Tab>("stats");
  const [myStatus, setMyStatus]               = useState<Status>("online");
  const [players, setPlayers]                 = useState<Player[]>([]);
  const [orgs, setOrgs]                       = useState<Organization[]>(MOCK_ORGS);
  const [selectedOrgId, setSelectedOrgId]     = useState<number | null>(null);
  const [notifications, setNotifications]     = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingPlayers, setLoadingPlayers]   = useState(false);
  const [isMock, setIsMock]                   = useState(false);

  // ── Уведомления ─────────────────────────────────────────────
  const addNotification = (note: Omit<Notification, "id" | "read">) => {
    setNotifications(prev => [{ ...note, id: Date.now(), read: false }, ...prev]);
    setShowNotifications(true);
  };

  // ── Загрузка игроков ─────────────────────────────────────────
  const fetchPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      const { data } = await apiGet(API_USERS);
      if (data.users) { setPlayers(data.users); setIsMock(false); }
    } catch {
      setPlayers(MOCK_USERS.map(({ password: _p, token: _t, ...u }) => { void _p; void _t; return u; }));
      setIsMock(true);
    } finally { setLoadingPlayers(false); }
  }, []);

  useEffect(() => { if (authUser) fetchPlayers(); }, [authUser, fetchPlayers]);

  // ── Heartbeat ────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser || myStatus !== "online") return;
    const tick = setInterval(async () => {
      try { await apiPost(API_USERS, { action: "set_status", user_id: authUser.id, status: "online" }); }
      catch { /* мок-режим */ }
    }, 60_000);
    return () => clearInterval(tick);
  }, [authUser, myStatus]);

  // ── Закрытие вкладки → offline ───────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    const onUnload = () => {
      navigator.sendBeacon(API_USERS, JSON.stringify({ action: "set_status", user_id: authUser.id, status: "offline" }));
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [authUser]);

  // ── Auth handlers ────────────────────────────────────────────
  const handleLogin = (user: AuthUser) => { setAuthUser(user); setMyStatus(user.status as Status); };
  const handleLogout = () => {
    if (authUser) apiPost(API_USERS, { action: "set_status", user_id: authUser.id, status: "offline" }).catch(() => {});
    setAuthUser(null); setPlayers([]); setActiveTab("stats"); setIsMock(false);
  };

  // ── Status / warnings / edit ─────────────────────────────────
  const handleStatusChange = async (status: Status) => {
    setMyStatus(status);
    if (!authUser) return;
    try { await apiPost(API_USERS, { action: "set_status", user_id: authUser.id, status }); }
    catch { /* мок */ }
  };

  const handleAddWarning = async (userId: number) => {
    try { await apiPost(API_USERS, { action: "add_warning", user_id: userId }); } catch { /* мок */ }
    if (isMock) setPlayers(p => p.map(u => u.id === userId ? { ...u, warnings: u.warnings + 1 } : u));
    else fetchPlayers();
  };

  const handleRemoveWarning = async (userId: number) => {
    try { await apiPost(API_USERS, { action: "remove_warning", user_id: userId }); } catch { /* мок */ }
    if (isMock) setPlayers(p => p.map(u => u.id === userId ? { ...u, warnings: Math.max(0, u.warnings - 1) } : u));
    else fetchPlayers();
  };

  const handleEditPlayer = async (userId: number, fields: { username?: string; rank?: string }) => {
    setPlayers(p => p.map(u => u.id === userId ? { ...u, ...fields } : u));
    try { await apiPost(API_USERS, { action: "edit_user", user_id: userId, ...fields }); }
    catch { /* мок: уже обновили локально */ }
  };

  const handleUpdatePlayer = (id: number, fields: Partial<Player>) =>
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));

  const handleUpdateOrg = (updated: Organization) =>
    setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o));

  // ── Экран входа ──────────────────────────────────────────────
  if (!authUser) return <LoginScreen onLogin={handleLogin} />;

  // ── Производные данные ───────────────────────────────────────
  const viewerRole      = authUser.role as Role;
  const canAccessAdmin  = viewerRole === "admin" || viewerRole === "curator";
  const canManageUsers  = viewerRole === "admin" || viewerRole === "curator" || viewerRole === "leader";
  const canSeeFullStats = viewerRole === "curator";

  const myOrg = viewerRole === "leader"
    ? orgs.find(o => o.leaderId === authUser.id) ?? null
    : null;

  const TABS: { id: Tab; label: string; icon: string; visible: boolean }[] = [
    { id: "stats",         label: "Статистика",   icon: "Activity",   visible: true },
    { id: "leaderboard",   label: "Рейтинг",      icon: "Trophy",     visible: true },
    { id: "users",         label: "Участники",    icon: "Users",      visible: canManageUsers },
    { id: "moderation",    label: "Модерация",    icon: "Shield",     visible: canManageUsers },
    { id: "organizations", label: "Организации",  icon: "Building2",  visible: viewerRole === "curator" || viewerRole === "leader" },
    { id: "admin_panel",   label: "Панель",       icon: "Settings",   visible: canAccessAdmin },
  ].filter(t => t.visible);

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setSelectedOrgId(null); };

  const onlinePlayers   = players.filter(p => p.status === "online").length;
  const afkPlayers      = players.filter(p => p.status === "afk").length;
  const totalOnlineToday = players.reduce((s, p) => s + p.onlineToday, 0);
  const sorted          = [...players].sort((a, b) => b.reputation - a.reputation);
  const myRank          = sorted.findIndex(p => p.id === authUser.id) + 1;

  return (
    <div className="hud-scanlines min-h-screen bg-[#09060f] text-purple-100 font-body">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-800/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-900/12 rounded-full blur-3xl" />
      </div>

      <AppHeader
        authUser={authUser}
        viewerRole={viewerRole}
        onlinePlayers={onlinePlayers}
        afkPlayers={afkPlayers}
        isMock={isMock}
        notifications={notifications}
        showNotifications={showNotifications}
        onToggleNotifications={() => setShowNotifications(v => !v)}
        onMarkAllRead={() => { setNotifications(p => p.map(n => ({ ...n, read: true }))); setShowNotifications(false); }}
        onLogout={handleLogout}
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
          viewerRole={viewerRole}
          players={players}
          orgs={orgs}
          selectedOrgId={selectedOrgId}
          loadingPlayers={loadingPlayers}
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
        />
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
