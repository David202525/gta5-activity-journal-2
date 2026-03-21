import { useState } from "react";
import Icon from "@/components/ui/icon";
import PlayerRow, { RoleBadge, StatCard, StatusDot, XPBar } from "@/components/shared/PlayerRow";
import WeekActivityChart from "@/components/shared/WeekActivityChart";
import OrgDetail from "@/components/shared/OrgDetail";
import HudTable from "@/components/shared/HudTable";
import { AddUserForm, CreateOrgForm } from "@/components/hud/AdminForms";
import {
  AuthUser, Player, Organization, Notification, TableSheet, Role, Tab,
  formatTime, isCuratorRole,
} from "@/lib/types";

interface TabContentProps {
  activeTab: Tab;
  authUser: AuthUser;
  viewerRole: Role;
  players: Player[];
  orgs: Organization[];
  selectedOrgId: number | null;
  loadingPlayers: boolean;
  myOrg: Organization | null;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  canSeeFullStats: boolean;
  onlinePlayers: number;
  afkPlayers: number;
  totalOnlineToday: number;
  sorted: Player[];
  myRank: number;
  onFetchPlayers: () => void;
  onAddWarning: (id: number) => void;
  onRemoveWarning: (id: number) => void;
  onEditPlayer: (id: number, fields: { username?: string; rank?: string }) => void;
  onSetSelectedOrgId: (id: number | null) => void;
  onUpdateOrg: (org: Organization) => void;
  onUpdatePlayer: (id: number, fields: Partial<Player>) => void;
  onNotify: (note: Omit<Notification, "id" | "read">) => void;
  onOrgCreated: (org: Organization) => void;
  onRoleChange?: (id: number, role: Role) => void;
  orgTable: TableSheet;
  adminTable: TableSheet;
  onOrgTableChange: (t: TableSheet) => void;
  onAdminTableChange: (t: TableSheet) => void;
}

export default function TabContent({
  activeTab, authUser, viewerRole, players, orgs,
  selectedOrgId, loadingPlayers, myOrg,
  canManageUsers, canAccessAdmin, canSeeFullStats,
  onlinePlayers, afkPlayers, totalOnlineToday,
  sorted, myRank, onRoleChange,
  orgTable, adminTable, onOrgTableChange, onAdminTableChange,
  onFetchPlayers, onAddWarning, onRemoveWarning, onEditPlayer,
  onSetSelectedOrgId, onUpdateOrg, onUpdatePlayer, onNotify, onOrgCreated,
}: TabContentProps) {

  // ── STATISTICS ──────────────────────────────────────────────
  if (activeTab === "stats") return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Онлайн сегодня" value={formatTime(authUser.onlineToday)} icon="Clock" sub="личная" delay={0} />
        <StatCard label="За неделю" value={formatTime(authUser.onlineWeek)} icon="Calendar" sub="7 дней" delay={60} />
        <StatCard label="Репутация" value={authUser.reputation.toLocaleString()} icon="Star" sub={myRank > 0 ? `ТОП ${myRank}` : "—"} delay={120} />
        <StatCard label="Уровень" value={`LVL ${authUser.level}`} icon="TrendingUp" sub={`${authUser.xp}/${authUser.xpMax} XP`} delay={180} />
      </div>

      <WeekActivityChart weekActivity={authUser.weekActivity} />

      <div className="hud-panel p-5 animate-fade-in" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
        <div className="font-hud text-sm tracking-wider text-purple-400 mb-4">СИСТЕМА РЕПУТАЦИИ</div>
        <div className="space-y-3.5">
          {[
            { label: "Боевая репутация",       val: 78, color: "xp-bar" },
            { label: "Социальная репутация",    val: 52, color: "rep-bar" },
            { label: "Рейтинг надёжности",      val: 91, color: "xp-bar" },
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
  );

  // ── LEADERBOARD ─────────────────────────────────────────────
  if (activeTab === "leaderboard") return (
    <div className="hud-panel overflow-hidden animate-fade-in">
      <div className="px-5 py-4 border-b border-purple-900/40 flex items-center justify-between">
        <div className="font-hud text-sm tracking-wider text-purple-400">
          ТАБЛИЦА ЛИДЕРОВ <span className="text-purple-700 ml-2 text-xs">по репутации</span>
        </div>
        {canSeeFullStats && (
          <span className="text-[10px] font-hud text-pink-400 border border-pink-800/40 bg-pink-900/20 px-2.5 py-1 rounded-full">КУРАТОР</span>
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
  );

  // ── USERS ────────────────────────────────────────────────────
  if (activeTab === "users" && canManageUsers) return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="font-hud text-sm tracking-wider text-purple-400">СПИСОК УЧАСТНИКОВ</div>
        <button onClick={onFetchPlayers}
          className="btn-hud flex items-center gap-2 text-[11px] font-hud tracking-wider px-3 py-2 bg-purple-900/30 border border-purple-800/40 text-purple-400 rounded-xl hover:bg-purple-800/30 transition-all">
          <Icon name="RefreshCw" size={11} />
          ОБНОВИТЬ
        </button>
      </div>
      <div className="hud-panel overflow-hidden py-2">
        {(viewerRole === "leader"
          ? players.filter(p => myOrg?.memberIds.includes(p.id))
          : players
        ).map((player, i) => (
          <PlayerRow key={player.id} player={player} index={i} canEdit={true}
            viewerRole={viewerRole}
            onAddWarning={onAddWarning} onRemoveWarning={onRemoveWarning}
            onEditPlayer={onEditPlayer} />
        ))}
      </div>
    </div>
  );

  // ── MODERATION ───────────────────────────────────────────────
  if (activeTab === "moderation" && canManageUsers) return (
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
            <button onClick={() => onRemoveWarning(player.id)}
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
  );

  // ── TABLES ───────────────────────────────────────────────────
  if (activeTab === "tables") {
    // Куратор и куратор_адм видят таблицу администрации
    const canSeeAdmin = viewerRole === "curator" || viewerRole === "curator_admin";
    // Куратор орг и лидер видят таблицу организации
    const canSeeOrg = viewerRole === "leader" || viewerRole === "curator" || viewerRole === "curator_faction" || viewerRole === "admin";
    // Структуру (столбцы) меняет куратор
    const canEditOrgStructure = viewerRole === "curator" || viewerRole === "curator_faction";
    const canEditAdminStructure = viewerRole === "curator" || viewerRole === "curator_admin";
    // Ячейки редактирует лидер или куратор
    const canEditOrgCells = viewerRole === "leader" || viewerRole === "curator" || viewerRole === "curator_faction";
    const canEditAdminCells = viewerRole === "curator" || viewerRole === "curator_admin";

    return (
      <div className="space-y-5 animate-fade-in">
        {/* Таблица организации */}
        {canSeeOrg && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Icon name="Building2" size={13} className="text-violet-400" />
              <span className="font-hud text-sm tracking-wider text-purple-400">ТАБЛИЦА ОРГАНИЗАЦИИ</span>
              {myOrg && <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/70">{myOrg.name}</span>}
              {!canEditOrgCells && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-mono-hud text-purple-800">
                  <Icon name="Eye" size={10} /> только просмотр
                </span>
              )}
            </div>
            <HudTable
              sheet={orgTable}
              canEditCells={canEditOrgCells}
              canEditStructure={canEditOrgStructure}
              onChange={onOrgTableChange}
            />
          </div>
        )}

        {/* Таблица администрации */}
        {canSeeAdmin && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Icon name="ShieldCheck" size={13} className="text-pink-400" />
              <span className="font-hud text-sm tracking-wider text-purple-400">ТАБЛИЦА АДМИНИСТРАЦИИ</span>
              {!canEditAdminCells && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-mono-hud text-purple-800">
                  <Icon name="Eye" size={10} /> только просмотр
                </span>
              )}
            </div>
            <HudTable
              sheet={adminTable}
              canEditCells={canEditAdminCells}
              canEditStructure={canEditAdminStructure}
              onChange={onAdminTableChange}
            />
          </div>
        )}

        {!canSeeOrg && !canSeeAdmin && (
          <div className="hud-panel p-10 text-center font-mono-hud text-xs text-purple-800">
            Нет доступа к таблицам
          </div>
        )}
      </div>
    );
  }

  // ── ORGANIZATIONS ────────────────────────────────────────────
  if (activeTab === "organizations" && (viewerRole === "curator" || viewerRole === "leader")) return (
    <div className="animate-fade-in">

      {/* LEADER VIEW */}
      {viewerRole === "leader" && (
        myOrg ? (
          <OrgDetail
            org={myOrg}
            allPlayers={players}
            viewerRole={viewerRole}
            viewerName={authUser.username}
            viewerId={authUser.id}
            onBack={() => {}}
            onUpdate={onUpdateOrg}
            onPlayerUpdate={onUpdatePlayer}
            onNotify={onNotify}
          />
        ) : (
          <div className="hud-panel p-10 text-center space-y-2">
            <Icon name="Building2" size={28} className="text-purple-800 mx-auto" />
            <div className="font-hud text-sm text-purple-700">Вы не назначены лидером ни одной организации</div>
            <div className="font-mono-hud text-xs text-purple-900">Обратитесь к куратору для создания организации</div>
          </div>
        )
      )}

      {/* CURATOR VIEW */}
      {viewerRole === "curator" && (
        selectedOrgId !== null ? (
          <OrgDetail
            org={orgs.find(o => o.id === selectedOrgId)!}
            allPlayers={players}
            viewerRole={viewerRole}
            viewerName={authUser.username}
            viewerId={authUser.id}
            onBack={() => onSetSelectedOrgId(null)}
            onUpdate={onUpdateOrg}
            onPlayerUpdate={onUpdatePlayer}
            onNotify={onNotify}
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
                    onClick={() => onSetSelectedOrgId(org.id)}>
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
            <CreateOrgForm players={players} onCreated={onOrgCreated} />
          </div>
        )
      )}
    </div>
  );

  // ── ADMIN PANEL ──────────────────────────────────────────────
  if (activeTab === "admin_panel" && canAccessAdmin) return (
    <AdminPanel
      viewerRole={viewerRole}
      authUser={authUser}
      players={players}
      canSeeFullStats={canSeeFullStats}
      onlinePlayers={onlinePlayers}
      totalOnlineToday={totalOnlineToday}
      onFetchPlayers={onFetchPlayers}
      onRoleChange={onRoleChange}
    />
  );

  return null;
}

// ─── ADMIN PANEL COMPONENT ────────────────────────────────────
function AdminPanel({ viewerRole, authUser, players, canSeeFullStats, onlinePlayers, totalOnlineToday, onFetchPlayers, onRoleChange }: {
  viewerRole: Role; authUser: AuthUser; players: Player[];
  canSeeFullStats: boolean; onlinePlayers: number; totalOnlineToday: number;
  onFetchPlayers: () => void; onRoleChange?: (id: number, role: Role) => void;
}) {
  const [curatorTarget, setCuratorTarget] = useState<number | null>(null);
  const isMainCurator = viewerRole === "curator";

  const staffPlayers = players.filter(p =>
    p.role === "admin" || isCuratorRole(p.role)
  );

  const adminPlayers = players.filter(p => p.role === "admin");

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="font-hud text-sm tracking-wider text-purple-400">ПАНЕЛЬ АДМИНИСТРАТОРА</div>
        <RoleBadge role={viewerRole} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Staff online */}
        <div className="hud-panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-purple-900/40 flex items-center gap-2">
            <Icon name="Activity" size={12} className="text-indigo-400" />
            <div className="font-hud text-xs tracking-widest text-indigo-400">ОНЛАЙН АДМИНИСТРАЦИИ</div>
          </div>
          <div className="p-4 space-y-3">
            {staffPlayers.map(player => (
              <div key={player.id} className="flex items-center gap-3">
                <StatusDot status={player.status} />
                <div className="flex-1">
                  <div className="text-xs font-hud text-purple-200">{player.username}</div>
                  <div className="text-[10px] text-purple-700 font-mono-hud">Сегодня: {formatTime(player.onlineToday)}</div>
                </div>
                <RoleBadge role={player.role} />
              </div>
            ))}
            {staffPlayers.length === 0 && (
              <div className="text-xs text-purple-800 font-mono-hud text-center py-2">Нет данных</div>
            )}
          </div>
        </div>

        {/* AFK stats */}
        <div className={`hud-panel overflow-hidden ${!canSeeFullStats ? "opacity-35 pointer-events-none" : ""}`}>
          <div className="px-5 py-3.5 border-b border-purple-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="BarChart3" size={12} className="text-pink-400" />
              <div className="font-hud text-xs tracking-widest text-pink-400">СТАТИСТИКА АФК</div>
            </div>
            {!canSeeFullStats && (
              <div className="flex items-center gap-1 text-[10px] font-hud text-purple-800">
                <Icon name="Lock" size={10} /> КУРАТОР
              </div>
            )}
          </div>
          <div className="p-4 space-y-2.5">
            {[
              { label: "Общий онлайн сегодня", val: formatTime(totalOnlineToday), icon: "Clock" },
              { label: "Участников онлайн",    val: `${onlinePlayers} / ${players.length}`, icon: "Users" },
              { label: "АФК нарушений",        val: `${players.filter(p => p.warnings > 0).length}`, icon: "AlertTriangle" },
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

      {/* Назначение ролей куратора (только главный куратор) */}
      {isMainCurator && (
        <div className="hud-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="ShieldCheck" size={13} className="text-violet-400" />
            <span className="font-hud text-xs tracking-widest text-purple-400/80">ПРАВА КУРАТОРА</span>
            <span className="text-[10px] font-mono-hud text-purple-800 ml-auto">только главный куратор</span>
          </div>

          <div className="space-y-2">
            {adminPlayers.map(player => {
              const isEditing = curatorTarget === player.id;
              return (
                <div key={player.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-900/10 border border-purple-800/20">
                  <StatusDot status={player.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-hud text-sm text-purple-100">{player.username}</div>
                    <div className="text-[10px] text-purple-700 font-mono-hud">
                      {formatTime(player.onlineToday)} сегодня
                    </div>
                  </div>
                  <RoleBadge role={player.role} />
                  {!isEditing ? (
                    <button onClick={() => setCuratorTarget(player.id)}
                      className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-violet-900/30 border border-violet-700/40 text-violet-400 rounded-lg hover:bg-violet-800/40 transition-all">
                      ПРАВА
                    </button>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { role: "curator_admin"   as Role, label: "КУР. АДМИН",    cls: "text-violet-400 border-violet-700/50 bg-violet-900/25 hover:bg-violet-800/40" },
                        { role: "curator_faction" as Role, label: "КУР. ФРАКЦИЙ",  cls: "text-cyan-400   border-cyan-700/50   bg-cyan-900/25   hover:bg-cyan-800/40" },
                        { role: "admin"           as Role, label: "СНЯТЬ",          cls: "text-zinc-500  border-zinc-700/40   bg-zinc-900/20   hover:bg-zinc-800/30" },
                      ]).map(btn => (
                        <button key={btn.role}
                          onClick={() => { onRoleChange?.(player.id, btn.role); setCuratorTarget(null); }}
                          className={`btn-hud text-[10px] font-hud tracking-wider px-2.5 py-1.5 rounded-lg border transition-all ${btn.cls}`}>
                          {btn.label}
                        </button>
                      ))}
                      <button onClick={() => setCuratorTarget(null)}
                        className="btn-hud text-[10px] font-hud px-2 py-1.5 rounded-lg border border-purple-900/40 text-purple-700 hover:text-purple-400 transition-all">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {adminPlayers.length === 0 && (
              <div className="text-xs font-mono-hud text-purple-800 text-center py-3">Администраторов нет</div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-purple-900/30 space-y-1.5">
            <div className="text-[10px] font-hud tracking-widest text-purple-800 mb-2">ЧТО МОГУТ ДЕЛАТЬ</div>
            {[
              { role: "curator_admin",   icon: "ShieldCheck", color: "text-violet-400", desc: "Следит за администрацией, может изменять имена администраторов" },
              { role: "curator_faction", icon: "Building2",   color: "text-cyan-400",   desc: "Следит за фракциями, управляет организациями" },
            ].map(item => (
              <div key={item.role} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-purple-900/10">
                <Icon name={item.icon} size={11} className={`${item.color} mt-0.5 flex-shrink-0`} />
                <span className="text-[10px] font-mono-hud text-purple-600">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddUserForm viewerRole={viewerRole} currentUsername={authUser.username} onAdded={onFetchPlayers} />
    </div>
  );
}