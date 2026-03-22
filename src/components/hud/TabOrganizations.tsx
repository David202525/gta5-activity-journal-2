import { useState } from "react";
import Icon from "@/components/ui/icon";
import OrgDetail from "@/components/shared/OrgDetail";
import { RoleBadge, StatusDot } from "@/components/shared/PlayerRow";
import { AddUserForm, CreateOrgForm } from "@/components/hud/AdminForms";
import {
  AuthUser, Player, Organization, Notification, Role,
  formatTime, isCuratorRole,
} from "@/lib/types";

// ─── ORGANIZATIONS TAB ────────────────────────────────────────
interface TabOrganizationsProps {
  viewerRole: Role;
  authUser: AuthUser;
  players: Player[];
  orgs: Organization[];
  selectedOrgId: number | null;
  myOrg: Organization | null;
  onSetSelectedOrgId: (id: number | null) => void;
  onUpdateOrg: (org: Organization) => void;
  onUpdatePlayer: (id: number, fields: Partial<Player>) => void;
  onNotify: (note: Omit<Notification, "id" | "read">) => void;
  onOrgCreated: (org: Organization) => void;
}

export function TabOrganizations({
  viewerRole, authUser, players, orgs, selectedOrgId, myOrg,
  onSetSelectedOrgId, onUpdateOrg, onUpdatePlayer, onNotify, onOrgCreated,
}: TabOrganizationsProps) {
  return (
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

      {/* CURATOR VIEW — все типы кураторов */}
      {isCuratorRole(viewerRole) && (
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
            {viewerRole === "curator" && <CreateOrgForm players={players} onCreated={onOrgCreated} />}
          </div>
        )
      )}
    </div>
  );
}

// ─── ADMIN PANEL TAB ──────────────────────────────────────────
interface TabAdminPanelProps {
  viewerRole: Role;
  authUser: AuthUser;
  players: Player[];
  canSeeFullStats: boolean;
  onlinePlayers: number;
  totalOnlineToday: number;
  onFetchPlayers: () => void;
  onRoleChange?: (id: number, role: Role) => void;
  onStatusChange?: (id: number, status: "online" | "afk" | "offline") => void;
}

export function TabAdminPanel({
  viewerRole, authUser, players, canSeeFullStats,
  onlinePlayers, totalOnlineToday, onFetchPlayers, onRoleChange, onStatusChange,
}: TabAdminPanelProps) {
  const [curatorTarget, setCuratorTarget] = useState<number | null>(null);
  const [subTarget, setSubTarget]         = useState<number | null>(null);
  const isMainCurator    = viewerRole === "curator";
  const isCuratorAdmin   = viewerRole === "curator_admin";
  const isCuratorFaction = viewerRole === "curator_faction";
  const isSubCurator     = isCuratorAdmin || isCuratorFaction;

  const staffPlayers = players.filter(p => p.role === "admin" || isCuratorRole(p.role));
  // Главный куратор управляет всеми кроме других кураторов
  const adminPlayers = players.filter(p => !isCuratorRole(p.role) && p.role !== "curator");

  // Список игроков в зоне ответственности суб-куратора
  const subCuratorTargets = isSubCurator
    ? players.filter(p => {
        if (isCuratorAdmin)   return p.role === "admin" || p.role === "user";
        if (isCuratorFaction) return p.role === "leader" || p.role === "deputy" || p.role === "user";
        return false;
      })
    : [];

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

      {/* Управление статусами администраторов — куратор и куратор_админ */}
      {(isMainCurator || isCuratorAdmin) && (
        <div className="hud-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Activity" size={13} className="text-emerald-400" />
            <span className="font-hud text-xs tracking-widest text-purple-400/80">СТАТУСЫ АДМИНИСТРАЦИИ</span>
          </div>
          <div className="space-y-2">
            {players.filter(p => p.role === "admin" || p.role === "curator_admin").map(player => (
              <div key={player.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-900/10 border border-purple-800/20">
                <StatusDot status={player.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-hud text-sm text-purple-100">{player.username}</div>
                  <div className="text-[10px] text-purple-700 font-mono-hud">{formatTime(player.onlineToday)} сегодня</div>
                </div>
                <RoleBadge role={player.role} />
                <div className="flex gap-1.5">
                  {(["online", "afk", "offline"] as const).map(s => (
                    <button key={s}
                      onClick={() => onStatusChange?.(player.id, s)}
                      className={`text-[9px] font-hud px-2 py-1 rounded-lg border transition-all ${
                        player.status === s
                          ? s === "online" ? "bg-emerald-900/40 border-emerald-600/50 text-emerald-300"
                            : s === "afk"  ? "bg-amber-900/40 border-amber-600/50 text-amber-300"
                            : "bg-zinc-900/40 border-zinc-600/50 text-zinc-300"
                          : "border-purple-900/30 text-purple-800 hover:text-purple-400 hover:border-purple-700/40"
                      }`}>
                      {s === "online" ? "ОНЛ" : s === "afk" ? "АФК" : "ВЫШ"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {players.filter(p => p.role === "admin" || p.role === "curator_admin").length === 0 && (
              <div className="text-xs font-mono-hud text-purple-800 text-center py-3">Нет администраторов</div>
            )}
          </div>
        </div>
      )}

      {/* Назначение прав куратора — только главный куратор */}
      {isMainCurator && (
        <div className="hud-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="ShieldCheck" size={13} className="text-violet-400" />
            <span className="font-hud text-xs tracking-widest text-purple-400/80">ПРАВА КУРАТОРА</span>
            <span className="text-[10px] font-mono-hud text-purple-800 ml-auto">только главный куратор</span>
          </div>

          {/* Текущие кураторы */}
          <div className="space-y-2 mb-4">
            <div className="text-[10px] font-hud tracking-widest text-purple-700 mb-2">ТЕКУЩИЕ КУРАТОРЫ</div>
            {players.filter(p => p.role === "curator_admin" || p.role === "curator_faction").map(player => {
              const isEditing = curatorTarget === player.id;
              return (
                <div key={player.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-900/15 border border-purple-700/30">
                  <StatusDot status={player.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-hud text-sm text-purple-100">{player.username}</div>
                    <div className="text-[10px] text-purple-700 font-mono-hud">{formatTime(player.onlineToday)} сегодня</div>
                  </div>
                  <RoleBadge role={player.role} />
                  {!isEditing ? (
                    <button onClick={() => setCuratorTarget(player.id)}
                      className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-violet-900/30 border border-violet-700/40 text-violet-400 rounded-lg hover:bg-violet-800/40 transition-all">
                      ИЗМЕНИТЬ
                    </button>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { role: "curator_admin"   as Role, label: "КУР. АДМИН",   cls: "text-violet-400 border-violet-700/50 bg-violet-900/25 hover:bg-violet-800/40" },
                        { role: "curator_faction" as Role, label: "КУР. ФРАКЦИЙ", cls: "text-cyan-400 border-cyan-700/50 bg-cyan-900/25 hover:bg-cyan-800/40" },
                        { role: "admin"           as Role, label: "СНЯТЬ ПРАВА",  cls: "text-zinc-500 border-zinc-700/40 bg-zinc-900/20 hover:bg-zinc-800/30" },
                      ]).filter(b => b.role !== player.role).map(btn => (
                        <button key={btn.role}
                          onClick={() => { onRoleChange?.(player.id, btn.role); setCuratorTarget(null); }}
                          className={`btn-hud text-[10px] font-hud tracking-wider px-2.5 py-1.5 rounded-lg border transition-all ${btn.cls}`}>
                          {btn.label}
                        </button>
                      ))}
                      <button onClick={() => setCuratorTarget(null)}
                        className="btn-hud text-[10px] font-hud px-2 py-1.5 rounded-lg border border-purple-900/40 text-purple-700 hover:text-purple-400 transition-all">✕</button>
                    </div>
                  )}
                </div>
              );
            })}
            {players.filter(p => p.role === "curator_admin" || p.role === "curator_faction").length === 0 && (
              <div className="text-xs font-mono-hud text-purple-800 text-center py-2">Кураторов пока нет</div>
            )}
          </div>

          {/* Назначить нового куратора из администраторов */}
          <div className="pt-3 border-t border-purple-900/30 space-y-2">
            <div className="text-[10px] font-hud tracking-widest text-purple-700 mb-2">НАЗНАЧИТЬ КУРАТОРА</div>
            {adminPlayers.filter(p => p.role === "admin").map(player => {
              const isEditing = curatorTarget === player.id;
              return (
                <div key={player.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-900/10 border border-purple-800/20">
                  <StatusDot status={player.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-hud text-sm text-purple-100">{player.username}</div>
                    <div className="text-[10px] text-purple-700 font-mono-hud">{formatTime(player.onlineToday)} сегодня</div>
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
                        { role: "curator_admin"   as Role, label: "КУР. АДМИН",   cls: "text-violet-400 border-violet-700/50 bg-violet-900/25 hover:bg-violet-800/40" },
                        { role: "curator_faction" as Role, label: "КУР. ФРАКЦИЙ", cls: "text-cyan-400 border-cyan-700/50 bg-cyan-900/25 hover:bg-cyan-800/40" },
                      ]).map(btn => (
                        <button key={btn.role}
                          onClick={() => { onRoleChange?.(player.id, btn.role); setCuratorTarget(null); }}
                          className={`btn-hud text-[10px] font-hud tracking-wider px-2.5 py-1.5 rounded-lg border transition-all ${btn.cls}`}>
                          {btn.label}
                        </button>
                      ))}
                      <button onClick={() => setCuratorTarget(null)}
                        className="btn-hud text-[10px] font-hud px-2 py-1.5 rounded-lg border border-purple-900/40 text-purple-700 hover:text-purple-400 transition-all">✕</button>
                    </div>
                  )}
                </div>
              );
            })}
            {adminPlayers.filter(p => p.role === "admin").length === 0 && (
              <div className="text-xs font-mono-hud text-purple-800 text-center py-2">Нет администраторов для назначения</div>
            )}
          </div>
        </div>
      )}

      {/* Блок для куратора администрации — назначает роли adminPlayers */}
      {isCuratorAdmin && (
        <div className="hud-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="ShieldCheck" size={13} className="text-violet-400" />
            <span className="font-hud text-xs tracking-widest text-purple-400/80">НАЗНАЧЕНИЕ РОЛЕЙ</span>
            <span className="text-[10px] font-mono-hud text-purple-800 ml-auto">куратор администрации</span>
          </div>
          <div className="text-[10px] font-mono-hud text-purple-700 mb-3 px-1">
            Вы можете назначать роли «Администратор», «Заместитель» и «Игрок» участникам.
          </div>
          <div className="space-y-2">
            {subCuratorTargets.map(player => {
              const isEditing = subTarget === player.id;
              return (
                <div key={player.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-900/10 border border-purple-800/20">
                  <StatusDot status={player.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-hud text-sm text-purple-100 truncate">{player.username}</div>
                    <div className="text-[10px] text-purple-700 font-mono-hud">{formatTime(player.onlineToday)} сегодня</div>
                  </div>
                  <RoleBadge role={player.role} />
                  {!isEditing ? (
                    <button onClick={() => setSubTarget(player.id)}
                      className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-violet-900/30 border border-violet-700/40 text-violet-400 rounded-lg hover:bg-violet-800/40 transition-all flex-shrink-0">
                      РОЛЬ
                    </button>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { role: "admin" as Role, label: "АДМИНИСТРАТОР", cls: "text-indigo-400 border-indigo-700/50 bg-indigo-900/25 hover:bg-indigo-800/40" },
                        { role: "user"  as Role, label: "ИГРОК",         cls: "text-zinc-500 border-zinc-700/40 bg-zinc-900/20 hover:bg-zinc-800/30" },
                      ]).map(btn => (
                        <button key={btn.role}
                          onClick={() => { onRoleChange?.(player.id, btn.role); setSubTarget(null); }}
                          className={`btn-hud text-[10px] font-hud tracking-wider px-2.5 py-1.5 rounded-lg border transition-all ${btn.cls}`}>
                          {btn.label}
                        </button>
                      ))}
                      <button onClick={() => setSubTarget(null)}
                        className="btn-hud text-[10px] font-hud px-2 py-1.5 rounded-lg border border-purple-900/40 text-purple-700 hover:text-purple-400 transition-all">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {subCuratorTargets.length === 0 && (
              <div className="text-xs font-mono-hud text-purple-800 text-center py-3">Нет участников для управления</div>
            )}
          </div>
        </div>
      )}

      {/* Блок для куратора фракций — назначает лидеров и заместителей */}
      {isCuratorFaction && (
        <div className="hud-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Building2" size={13} className="text-cyan-400" />
            <span className="font-hud text-xs tracking-widest text-purple-400/80">НАЗНАЧЕНИЕ РОЛЕЙ</span>
            <span className="text-[10px] font-mono-hud text-purple-800 ml-auto">куратор фракций</span>
          </div>
          <div className="text-[10px] font-mono-hud text-purple-700 mb-3 px-1">
            Вы можете назначать роли «Лидер», «Заместитель» и «Игрок» участникам фракций.
          </div>
          <div className="space-y-2">
            {subCuratorTargets.map(player => {
              const isEditing = subTarget === player.id;
              return (
                <div key={player.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-900/10 border border-purple-800/20">
                  <StatusDot status={player.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-hud text-sm text-purple-100 truncate">{player.username}</div>
                    <div className="text-[10px] text-purple-700 font-mono-hud">{formatTime(player.onlineToday)} сегодня</div>
                  </div>
                  <RoleBadge role={player.role} />
                  {!isEditing ? (
                    <button onClick={() => setSubTarget(player.id)}
                      className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-cyan-900/30 border border-cyan-700/40 text-cyan-400 rounded-lg hover:bg-cyan-800/40 transition-all flex-shrink-0">
                      РОЛЬ
                    </button>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { role: "leader" as Role, label: "ЛИДЕР",       cls: "text-amber-400 border-amber-700/50 bg-amber-900/25 hover:bg-amber-800/40" },
                        { role: "deputy" as Role, label: "ЗАМЕСТИТЕЛЬ", cls: "text-orange-400 border-orange-700/50 bg-orange-900/25 hover:bg-orange-800/40" },
                        { role: "user"   as Role, label: "ИГРОК",       cls: "text-zinc-500 border-zinc-700/40 bg-zinc-900/20 hover:bg-zinc-800/30" },
                      ]).map(btn => (
                        <button key={btn.role}
                          onClick={() => { onRoleChange?.(player.id, btn.role); setSubTarget(null); }}
                          className={`btn-hud text-[10px] font-hud tracking-wider px-2.5 py-1.5 rounded-lg border transition-all ${btn.cls}`}>
                          {btn.label}
                        </button>
                      ))}
                      <button onClick={() => setSubTarget(null)}
                        className="btn-hud text-[10px] font-hud px-2 py-1.5 rounded-lg border border-purple-900/40 text-purple-700 hover:text-purple-400 transition-all">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {subCuratorTargets.length === 0 && (
              <div className="text-xs font-mono-hud text-purple-800 text-center py-3">Нет участников для управления</div>
            )}
          </div>
        </div>
      )}

      <AddUserForm viewerRole={viewerRole} currentUsername={authUser.username} onAdded={onFetchPlayers} />
    </div>
  );
}