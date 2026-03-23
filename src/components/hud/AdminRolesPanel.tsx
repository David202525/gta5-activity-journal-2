import { useState } from "react";
import Icon from "@/components/ui/icon";
import { RoleBadge, StatusDot } from "@/components/shared/PlayerRow";
import { AddUserForm } from "@/components/hud/AdminForms";
import { AuthUser, Player, Role, formatTime, isCuratorRole } from "@/lib/types";

interface AdminRolesPanelProps {
  viewerRole: Role;
  authUser: AuthUser;
  players: Player[];
  isMainCurator: boolean;
  isCuratorAdmin: boolean;
  isCuratorFaction: boolean;
  isSubCurator: boolean;
  subCuratorTargets: Player[];
  onFetchPlayers: () => void;
  onRoleChange?: (id: number, role: Role) => void;
}

export default function AdminRolesPanel({
  viewerRole, authUser, players,
  isMainCurator, isCuratorAdmin, isCuratorFaction, isSubCurator,
  subCuratorTargets, onFetchPlayers, onRoleChange,
}: AdminRolesPanelProps) {
  const [curatorTarget, setCuratorTarget] = useState<number | null>(null);
  const [subTarget, setSubTarget]         = useState<number | null>(null);

  const adminPlayers = players.filter(p => !isCuratorRole(p.role) && p.role !== "curator");

  return (
    <>
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

      {/* Блок для куратора администрации */}
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
                        className="btn-hud text-[10px] font-hud px-2 py-1.5 rounded-lg border border-purple-900/40 text-purple-700 hover:text-purple-400 transition-all">✕</button>
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

      {/* Блок для куратора фракций */}
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
                        className="btn-hud text-[10px] font-hud px-2 py-1.5 rounded-lg border border-purple-900/40 text-purple-700 hover:text-purple-400 transition-all">✕</button>
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
    </>
  );
}
