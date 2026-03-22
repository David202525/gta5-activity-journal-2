import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  OrgRank, Player, Penalty, Status,
  STATUS_LABELS, PENALTY_LABELS,
  formatTime, nextPenaltyType, countActivePenalties, issuePenaltyToList,
} from "@/lib/types";
import { StatusDot, XPBar } from "./PlayerRow";

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
interface OrgMemberRowProps {
  player: Player;
  isLeader: boolean;
  canManage: boolean;
  issuerName: string;
  orgRanks: OrgRank[];
  memberRankId?: number;
  onRemoveFromOrg?: (id: number) => void;
  onPenaltyUpdate?: (id: number, penalties: Penalty[], excluded: boolean) => void;
  onStatusChange?: (id: number, fromStatus: Status, toStatus: Status) => void;
  onRankAssign?: (playerId: number, rankId: number | null) => void;
}

export default function OrgMemberRow({
  player, isLeader, canManage, issuerName, orgRanks, memberRankId,
  onRemoveFromOrg, onPenaltyUpdate, onStatusChange, onRankAssign,
}: OrgMemberRowProps) {
  const [expanded, setExpanded] = useState(false);

  const penalties = player.penalties ?? [];
  const activePenalties = penalties.filter(p => p.isActive);
  const { verbal, reprimand } = countActivePenalties(penalties);

  const issuePenalty = (reason: string) => {
    const { newPenalties, excluded } = issuePenaltyToList(penalties, reason, issuerName);
    onPenaltyUpdate?.(player.id, newPenalties, excluded);
  };

  const removePenalty = (penaltyId: number) => {
    onPenaltyUpdate?.(player.id, penalties.map(p => p.id === penaltyId ? { ...p, isActive: false } : p), false);
  };

  const statusColor = player.status === "online" ? "text-emerald-400"
    : player.status === "afk" ? "text-amber-400" : "text-zinc-500";

  const penaltyLabel = reprimand > 0 ? `выговор ×${reprimand}` : verbal > 0 ? `устное ×${verbal}` : null;
  const assignedRank = orgRanks.find(r => r.id === memberRankId);

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
            {assignedRank && (
              <span className={`text-[9px] font-hud px-2 py-0.5 rounded-full border border-current/30 bg-current/10 ${assignedRank.color}`}>
                {assignedRank.name}
              </span>
            )}
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
          {/* Stats */}
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

              {/* Назначить ранг организации */}
              {!isLeader && orgRanks.length > 0 && (
                <div>
                  <div className="text-[10px] font-hud tracking-widest text-purple-700 mb-2">РАНГ В ОРГАНИЗАЦИИ</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); onRankAssign?.(player.id, null); }}
                      className={`text-[10px] font-hud px-2.5 py-1 rounded-lg border transition-all ${
                        !memberRankId ? "bg-purple-700/30 border-purple-600/50 text-purple-200" : "border-purple-900/40 text-purple-700 hover:border-purple-700/50 hover:text-purple-400"
                      }`}>
                      — Без ранга
                    </button>
                    {orgRanks.map(rank => (
                      <button key={rank.id}
                        onClick={e => { e.stopPropagation(); onRankAssign?.(player.id, rank.id); }}
                        className={`text-[10px] font-hud px-2.5 py-1 rounded-lg border transition-all ${
                          memberRankId === rank.id
                            ? `bg-current/10 border-current/30 ${rank.color}`
                            : `border-purple-900/40 text-purple-700 hover:border-purple-700/50 hover:text-purple-400`
                        }`}>
                        {rank.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Изменить статус */}
              {(
                <div>
                  <div className="text-[10px] font-hud tracking-widest text-purple-700 mb-2">ИЗМЕНИТЬ СТАТУС</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["online", "afk", "offline"] as Status[]).map(s => (
                      <button key={s}
                        onClick={e => { e.stopPropagation(); onStatusChange?.(player.id, player.status, s); }}
                        className={`text-[10px] font-hud px-2.5 py-1 rounded-lg border transition-all ${
                          player.status === s
                            ? s === "online" ? "bg-emerald-900/30 border-emerald-700/50 text-emerald-300"
                              : s === "afk" ? "bg-amber-900/30 border-amber-700/50 text-amber-300"
                              : "bg-zinc-900/30 border-zinc-700/50 text-zinc-300"
                            : "border-purple-900/40 text-purple-700 hover:border-purple-700/50 hover:text-purple-400"
                        }`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Взыскание вручную */}
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

              {/* Исключить */}
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
