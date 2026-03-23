import Icon from "@/components/ui/icon";
import { RoleBadge, StatusDot } from "@/components/shared/PlayerRow";
import { Player, Role, formatTime } from "@/lib/types";

interface AdminStaffPanelProps {
  viewerRole: Role;
  players: Player[];
  canSeeFullStats: boolean;
  onlinePlayers: number;
  totalOnlineToday: number;
  isMainCurator: boolean;
  isCuratorAdmin: boolean;
  onStatusChange?: (id: number, status: "online" | "afk" | "offline") => void;
}

export default function AdminStaffPanel({
  viewerRole, players, canSeeFullStats, onlinePlayers, totalOnlineToday,
  isMainCurator, isCuratorAdmin, onStatusChange,
}: AdminStaffPanelProps) {
  const staffPlayers = players.filter(p =>
    p.role === "admin" || p.role === "curator_admin" || p.role === "curator_faction"
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Онлайн администрации */}
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

        {/* Статистика АФК */}
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

      {/* Управление статусами администраторов */}
      {(isMainCurator || isCuratorAdmin) && (
        <div className="hud-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Activity" size={13} className="text-emerald-400" />
            <span className="font-hud text-xs tracking-widest text-purple-400/80">СТАТУСЫ АДМИНИСТРАЦИИ</span>
          </div>
          <div className="space-y-2">
            {players.filter(p => p.role === "admin" || p.role === "curator_admin" || p.role === "curator_faction").map(player => (
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
            {players.filter(p => p.role === "admin" || p.role === "curator_admin" || p.role === "curator_faction").length === 0 && (
              <div className="text-xs font-mono-hud text-purple-800 text-center py-3">Нет администраторов</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
