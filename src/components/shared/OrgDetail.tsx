import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  Organization, Player, Role, Status, Penalty, Notification,
  STATUS_COLORS, STATUS_LABELS, PENALTY_LABELS,
  formatTime, nextPenaltyType, countActivePenalties, statusChangePenaltyReason, issuePenaltyToList,
} from "@/lib/types";
import { RoleBadge, StatusDot, XPBar } from "./PlayerRow";

// ─── PENALTY BADGE ────────────────────────────────────────────
function PenaltyBadge({ type }: { type: Penalty["type"] }) {
  const cls = {
    verbal:    "text-amber-400 border-amber-700/50 bg-amber-900/20",
    reprimand: "text-red-400   border-red-700/50   bg-red-900/20",
    excluded:  "text-zinc-400  border-zinc-700/50  bg-zinc-900/20",
  }[type];
  return (
    <span className={`text-[9px] font-hud tracking-widest px-2 py-0.5 border rounded-full ${cls}`}>
      {PENALTY_LABELS[type]}
    </span>
  );
}

// ─── MEMBER ROW ───────────────────────────────────────────────
function MemberRow({ player, isLeader, canManage, issuerName, onRemoveFromOrg, onPenaltyUpdate, onStatusChange }: {
  player: Player;
  isLeader: boolean;
  canManage: boolean;
  issuerName: string;
  onRemoveFromOrg?: (id: number) => void;
  onPenaltyUpdate?: (id: number, penalties: Penalty[], excluded: boolean) => void;
  onStatusChange?: (id: number, fromStatus: Status, toStatus: Status) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const penalties = player.penalties ?? [];
  const activePenalties = penalties.filter(p => p.isActive);
  const { verbal, reprimand } = countActivePenalties(penalties);

  const issuePenalty = (reason: string) => {
    const { newPenalties, excluded } = issuePenaltyToList(penalties, reason, issuerName);
    onPenaltyUpdate?.(player.id, newPenalties, excluded);
  };

  const removePenalty = (penaltyId: number) => {
    onPenaltyUpdate?.(
      player.id,
      penalties.map(p => p.id === penaltyId ? { ...p, isActive: false } : p),
      false,
    );
  };

  const statusColor = player.status === "online" ? "text-emerald-400"
    : player.status === "afk" ? "text-amber-400" : "text-zinc-500";

  const penaltyLabel = reprimand > 0 ? `выговор ×${reprimand}`
    : verbal > 0 ? `устное ×${verbal}` : null;

  return (
    <div>
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all rounded-xl mx-2 my-0.5 ${
          expanded ? "bg-purple-900/20 border border-purple-700/30"
            : "border border-transparent hover:bg-purple-900/10 hover:border-purple-800/20"
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <StatusDot status={player.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-hud text-sm text-purple-100">{player.username}</span>
            {isLeader && (
              <span className="text-[9px] font-hud px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-700/40 text-amber-400">ЛИДЕР</span>
            )}
            <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/80">RNK {player.rank}</span>
            {penaltyLabel && (
              <span className="text-[9px] font-mono-hud text-red-400 bg-red-900/20 border border-red-800/30 px-1.5 py-0.5 rounded">⚠ {penaltyLabel}</span>
            )}
          </div>
          <div className="text-[10px] text-purple-700 font-mono-hud">{player.title}</div>
        </div>

        <div className="hidden sm:flex flex-col items-end">
          <span className={`text-xs font-mono-hud ${statusColor}`}>{STATUS_LABELS[player.status]}</span>
          <span className="text-[10px] text-purple-800 font-mono-hud">{formatTime(player.onlineToday)} сегодня</span>
        </div>
        <div className="text-right hidden md:block w-20">
          <div className="font-hud text-sm neon-gold">LVL {player.level}</div>
          <div className="text-[10px] text-purple-700 font-mono-hud">{player.reputation.toLocaleString()} REP</div>
        </div>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={13} className="text-purple-700 flex-shrink-0" />
      </div>

      {expanded && (
        <div className="mx-3 mb-2 p-4 bg-purple-950/40 border border-purple-800/20 rounded-xl space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "ОНЛАЙН СЕГОДНЯ", val: formatTime(player.onlineToday), cls: "text-purple-300" },
              { label: "ОНЛАЙН НЕДЕЛЯ",  val: formatTime(player.onlineWeek),  cls: "text-purple-300" },
              { label: "СТАТУС",         val: STATUS_LABELS[player.status],   cls: statusColor },
              { label: "ВЗЫСКАНИЙ",      val: activePenalties.length > 0 ? String(activePenalties.length) : "—",
                cls: activePenalties.length > 0 ? "neon-red" : "text-purple-800" },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-[10px] text-purple-800 font-hud tracking-wider mb-1">{item.label}</div>
                <div className={`text-sm font-mono-hud ${item.cls}`}>{item.val}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-purple-800 font-hud w-14">XP</span>
            <XPBar value={player.xp} max={player.xpMax} color="xp-bar" />
            <span className="text-[10px] font-mono-hud text-purple-700 w-8 text-right">{Math.round((player.xp / player.xpMax) * 100)}%</span>
          </div>

          {/* Активные взыскания */}
          {activePenalties.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-hud tracking-widest text-purple-700">АКТИВНЫЕ ВЗЫСКАНИЯ</div>
              {activePenalties.map(p => (
                <div key={p.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-red-900/10 border border-red-900/25">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <PenaltyBadge type={p.type} />
                      <span className="text-[10px] font-mono-hud text-purple-700">от {p.issuedBy}</span>
                    </div>
                    <div className="text-xs text-purple-400 font-mono-hud">{p.reason}</div>
                    <div className="text-[10px] text-purple-800 mt-0.5">
                      {new Date(p.issuedAt).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {canManage && (
                    <button onClick={e => { e.stopPropagation(); removePenalty(p.id); }}
                      className="text-[10px] font-hud text-emerald-500 hover:text-emerald-300 border border-emerald-800/30 px-2 py-1 rounded-lg hover:bg-emerald-900/20 transition-all flex-shrink-0">
                      СНЯТЬ
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canManage && (
            <div className="space-y-3 pt-2 border-t border-purple-900/40">

              {/* Смена статуса */}
              <div>
                <div className="text-[10px] font-hud tracking-widest text-purple-700 mb-2">
                  ИЗМЕНИТЬ СТАТУС
                  <span className="ml-2 text-amber-600/70 normal-case font-mono-hud">→ автовзыскание</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["online", "afk", "offline"] as Status[]).map(s => (
                    <button key={s}
                      onClick={e => { e.stopPropagation(); onStatusChange?.(player.id, player.status, s); }}
                      disabled={player.status === s}
                      className={`btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        player.status === s
                          ? s === "online" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : s === "afk"  ? "bg-amber-500/15  border-amber-500/40  text-amber-400"
                            : "bg-zinc-700/20 border-zinc-600/40 text-zinc-400"
                          : "bg-transparent border-purple-900/40 text-purple-700 hover:border-purple-700/50 hover:text-purple-400"
                      }`}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ручное взыскание */}
              {!isLeader && (
                <div>
                  <div className="text-[10px] font-hud tracking-widest text-purple-700 mb-2">
                    ВЗЫСКАНИЕ ВРУЧНУЮ
                    <span className="ml-2 text-purple-800 font-mono-hud normal-case">
                      (след.: {PENALTY_LABELS[nextPenaltyType(penalties)]})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={e => { e.stopPropagation(); issuePenalty("Дисциплинарное нарушение"); }}
                      className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-lg hover:bg-red-500/18 transition-all">
                      + ВЗЫСКАНИЕ
                    </button>
                    {activePenalties.length > 0 && (
                      <button onClick={e => { e.stopPropagation(); removePenalty(activePenalties[activePenalties.length - 1].id); }}
                        className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg hover:bg-emerald-500/18 transition-all">
                        СНЯТЬ ПОСЛЕДНЕЕ
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!isLeader && (
                <button onClick={e => { e.stopPropagation(); onRemoveFromOrg?.(player.id); }}
                  className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-red-900/15 border border-red-800/30 text-red-600 rounded-lg hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-all">
                  ИСКЛЮЧИТЬ ИЗ ОРГАНИЗАЦИИ
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ORG DETAIL ───────────────────────────────────────────────
interface OrgDetailProps {
  org: Organization;
  allPlayers: Player[];
  viewerRole: Role;
  viewerName: string;
  viewerId: number;
  onBack: () => void;
  onUpdate: (org: Organization) => void;
  onPlayerUpdate?: (id: number, fields: Partial<Player>) => void;
  onNotify?: (note: Omit<Notification, "id" | "read">) => void;
}

export default function OrgDetail({
  org, allPlayers, viewerRole, viewerName, viewerId,
  onBack, onUpdate, onPlayerUpdate, onNotify,
}: OrgDetailProps) {
  const [addSearch, setAddSearch] = useState("");

  const isCuratorOrAdmin = viewerRole === "curator" || viewerRole === "admin";
  const isLeaderOfOrg = viewerRole === "leader" && org.leaderId === viewerId;
  const canManage = isCuratorOrAdmin || isLeaderOfOrg;

  const members = allPlayers.filter(p => org.memberIds.includes(p.id));
  const onlineCount = members.filter(p => p.status === "online").length;
  const afkCount = members.filter(p => p.status === "afk").length;
  const totalOnlineToday = members.reduce((s, p) => s + p.onlineToday, 0);

  const notMembers = allPlayers.filter(p =>
    !org.memberIds.includes(p.id) &&
    p.id !== org.leaderId &&
    (addSearch === "" || p.username.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const handleRemoveFromOrg = (playerId: number) =>
    onUpdate({ ...org, memberIds: org.memberIds.filter(id => id !== playerId) });

  const handleAdd = (playerId: number) => {
    if (org.memberIds.includes(playerId)) return;
    onUpdate({ ...org, memberIds: [...org.memberIds, playerId] });
    setAddSearch("");
  };

  const handleStatusChange = (playerId: number, fromStatus: Status, toStatus: Status) => {
    if (fromStatus === toStatus) return;
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    const reason = statusChangePenaltyReason(fromStatus, toStatus);
    const penalties = player.penalties ?? [];
    const { newPenalties, type, excluded } = issuePenaltyToList(penalties, reason, viewerName);

    onPlayerUpdate?.(playerId, {
      status: toStatus,
      penalties: newPenalties,
      warnings: newPenalties.filter(p => p.isActive).length,
    });

    const notifyText = excluded
      ? `🚫 ${player.username} автоматически исключён (3 выговора). Причина: ${reason}`
      : `⚠ ${player.username} получил «${PENALTY_LABELS[type]}». Причина: ${reason}`;

    onNotify?.({ text: notifyText, type: excluded ? "excluded" : "warning", timestamp: new Date().toISOString() });

    if (excluded) {
      onUpdate({ ...org, memberIds: org.memberIds.filter(id => id !== playerId) });
    }
  };

  const handlePenaltyUpdate = (playerId: number, penalties: Penalty[], excluded: boolean) => {
    const player = allPlayers.find(p => p.id === playerId);
    onPlayerUpdate?.(playerId, { penalties, warnings: penalties.filter(p => p.isActive).length });
    if (excluded && player) {
      onUpdate({ ...org, memberIds: org.memberIds.filter(id => id !== playerId) });
      onNotify?.({ text: `🚫 ${player.username} автоматически исключён после 3 выговоров`, type: "excluded", timestamp: new Date().toISOString() });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        {viewerRole === "curator" && (
          <button onClick={onBack}
            className="w-8 h-8 rounded-lg bg-white/4 border border-purple-900/50 flex items-center justify-center hover:border-violet-600/40 hover:bg-violet-900/20 transition-all">
            <Icon name="ArrowLeft" size={13} className="text-purple-400" />
          </button>
        )}
        <div className="flex items-center gap-2 flex-1">
          <span className="font-hud text-lg gradient-text">{org.name}</span>
          <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/80">{org.tag}</span>
        </div>
        <RoleBadge role={viewerRole} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "УЧАСТНИКОВ",   val: String(members.length), icon: "Users",    cls: "text-purple-300" },
          { label: "ОНЛАЙН",       val: String(onlineCount),    icon: "Wifi",     cls: "text-emerald-400" },
          { label: "АФК",          val: String(afkCount),       icon: "Clock",    cls: "text-amber-400" },
          { label: "ОБЩИЙ ОНЛАЙН", val: formatTime(totalOnlineToday), icon: "BarChart2", cls: "text-violet-300" },
        ].map((item, i) => (
          <div key={i} className="hud-panel p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon name={item.icon} size={11} className="text-purple-700" />
              <span className="text-[10px] font-hud tracking-widest text-purple-700">{item.label}</span>
            </div>
            <div className={`font-hud text-xl ${item.cls}`}>{item.val}</div>
          </div>
        ))}
      </div>

      {org.description && (
        <div className="hud-panel px-5 py-3 flex items-center gap-2">
          <Icon name="Info" size={12} className="text-purple-700 flex-shrink-0" />
          <span className="text-xs text-purple-600 font-mono-hud">{org.description}</span>
        </div>
      )}

      <div className="hud-panel overflow-hidden">
        <div className="px-5 py-3.5 border-b border-purple-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Users" size={12} className="text-indigo-400" />
            <span className="font-hud text-xs tracking-widest text-indigo-400">СОСТАВ ОРГАНИЗАЦИИ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono-hud text-[10px] text-purple-600">{onlineCount} онлайн</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="font-mono-hud text-[10px] text-purple-700">{afkCount} АФК</span>
            </div>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="p-8 text-center font-mono-hud text-xs text-purple-800">Нет участников</div>
        ) : (
          <div className="py-2">
            {[...members]
              .sort((a, b) => {
                if (a.id === org.leaderId) return -1;
                if (b.id === org.leaderId) return 1;
                const order = { online: 0, afk: 1, offline: 2 };
                return order[a.status] - order[b.status];
              })
              .map(player => (
                <MemberRow
                  key={player.id}
                  player={player}
                  isLeader={player.id === org.leaderId}
                  canManage={canManage}
                  issuerName={viewerName}
                  onRemoveFromOrg={handleRemoveFromOrg}
                  onPenaltyUpdate={handlePenaltyUpdate}
                  onStatusChange={handleStatusChange}
                />
              ))}
          </div>
        )}
      </div>

      {canManage && (
        <div className="hud-panel p-5">
          <div className="font-hud text-xs tracking-widest text-purple-600 mb-3 flex items-center gap-2">
            <Icon name="UserPlus" size={12} className="text-violet-400" />
            ДОБАВИТЬ УЧАСТНИКА
          </div>
          <input
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            placeholder="Начните вводить ник..."
            className="w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-2.5 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 bg-transparent focus:border-violet-600/50 transition-all mb-3"
          />
          {addSearch.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {notMembers.length === 0 ? (
                <div className="text-xs font-mono-hud text-purple-800 px-2 py-2">Не найдено</div>
              ) : notMembers.slice(0, 8).map(p => (
                <div key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-900/30 cursor-pointer border border-transparent hover:border-purple-800/30 transition-all"
                  onClick={() => handleAdd(p.id)}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[p.status]}`} />
                  <span className="font-hud text-sm text-purple-200 flex-1">{p.username}</span>
                  <RoleBadge role={p.role} />
                  <Icon name="Plus" size={12} className="text-violet-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}