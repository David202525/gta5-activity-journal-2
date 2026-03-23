import { useState } from "react";
import Icon from "@/components/ui/icon";
import PlayerRow, { RoleBadge, StatusDot } from "@/components/shared/PlayerRow";
import { Player, Role, Organization } from "@/lib/types";

// ─── LEADERBOARD ─────────────────────────────────────────────
interface TabLeaderboardProps {
  sorted: Player[];
  canSeeFullStats: boolean;
  loadingPlayers: boolean;
}

export function TabLeaderboard({ sorted, canSeeFullStats, loadingPlayers }: TabLeaderboardProps) {
  return (
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
}

// ─── USERS ────────────────────────────────────────────────────
interface TabUsersProps {
  players: Player[];
  viewerRole: Role;
  myOrg: Organization | null;
  onFetchPlayers: () => void;
  onAddWarning: (id: number, reason: string) => void;
  onRemoveWarning: (id: number) => void;
  onEditPlayer: (id: number, fields: { username?: string; rank?: string }) => void;
  onRoleChange?: (id: number, role: Role) => void;
}

export function TabUsers({ players, viewerRole, myOrg, onFetchPlayers, onAddWarning, onRemoveWarning, onEditPlayer, onRoleChange }: TabUsersProps) {
  const [search, setSearch] = useState("");

  const baseList = viewerRole === "leader"
    ? players.filter(p => myOrg?.memberIds.includes(p.id))
    : players;

  const filtered = search.trim()
    ? baseList.filter(p =>
        p.username.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.rank.toLowerCase().includes(search.toLowerCase())
      )
    : baseList;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="font-hud text-sm tracking-wider text-purple-400 flex-shrink-0">СПИСОК УЧАСТНИКОВ</div>
        <div className="flex-1 relative">
          <Icon name="Search" size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-700 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по нику, должности, рангу..."
            className="w-full border border-purple-800/40 text-purple-100 text-xs px-3 py-2 pl-8 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/50 bg-transparent focus:border-violet-600/50 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-700 hover:text-purple-400 transition-colors">
              <Icon name="X" size={11} />
            </button>
          )}
        </div>
        <button onClick={onFetchPlayers}
          className="btn-hud flex items-center gap-2 text-[11px] font-hud tracking-wider px-3 py-2 bg-purple-900/30 border border-purple-800/40 text-purple-400 rounded-xl hover:bg-purple-800/30 transition-all flex-shrink-0">
          <Icon name="RefreshCw" size={11} />
          ОБНОВИТЬ
        </button>
      </div>
      {search && (
        <div className="text-[10px] font-mono-hud text-purple-700">
          Найдено: {filtered.length} из {baseList.length}
        </div>
      )}
      <div className="hud-panel overflow-hidden py-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center font-mono-hud text-xs text-purple-800">Никого не найдено</div>
        ) : (
          filtered.map((player, i) => (
            <PlayerRow key={player.id} player={player} index={i} canEdit={true}
              viewerRole={viewerRole}
              onAddWarning={onAddWarning} onRemoveWarning={onRemoveWarning}
              onEditPlayer={onEditPlayer} onRoleChange={onRoleChange} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── MODERATION ───────────────────────────────────────────────
interface TabModerationProps {
  players: Player[];
  onRemoveWarning: (id: number) => void;
}

export function TabModeration({ players, onRemoveWarning }: TabModerationProps) {
  return (
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
}