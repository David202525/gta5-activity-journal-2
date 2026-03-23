import Icon from "@/components/ui/icon";
import { Organization, OrgRank, Player, Penalty, Status } from "@/lib/types";
import OrgMemberRow from "./OrgMemberRow";

interface OrgMemberListProps {
  org: Organization;
  members: Player[];
  canManage: boolean;
  issuerName: string;
  onlineCount: number;
  afkCount: number;
  onRemoveFromOrg: (id: number) => void;
  onPenaltyUpdate: (id: number, penalties: Penalty[], excluded: boolean) => void;
  onStatusChange: (id: number, fromStatus: Status, toStatus: Status) => void;
  onRankAssign: (playerId: number, rankId: number | null) => void;
}

export default function OrgMemberList({
  org, members, canManage, issuerName, onlineCount, afkCount,
  onRemoveFromOrg, onPenaltyUpdate, onStatusChange, onRankAssign,
}: OrgMemberListProps) {
  const orgRanks: OrgRank[]                = org.orgRanks ?? [];
  const memberRanks: Record<number, number> = org.memberRanks ?? {};

  return (
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
              <OrgMemberRow
                key={player.id}
                player={player}
                isLeader={player.id === org.leaderId}
                isDeputy={player.role === "deputy"}
                canManage={canManage}
                issuerName={issuerName}
                orgRanks={orgRanks}
                memberRankId={memberRanks[player.id]}
                dailyNorm={org.dailyNorm}
                weeklyNorm={org.weeklyNorm}
                onRemoveFromOrg={onRemoveFromOrg}
                onPenaltyUpdate={onPenaltyUpdate}
                onStatusChange={onStatusChange}
                onRankAssign={onRankAssign}
              />
            ))}
        </div>
      )}
    </div>
  );
}