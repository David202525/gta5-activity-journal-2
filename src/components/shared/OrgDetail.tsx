import { useState } from "react";
import Icon from "@/components/ui/icon";
import OrgRanksPanel from "@/components/shared/OrgRanksPanel";
import OrgDetailHeader from "./OrgDetailHeader";
import OrgMemberList from "./OrgMemberList";
import OrgAddMember from "./OrgAddMember";
import {
  Organization, OrgRank, Player, Role, Status, Penalty, Notification,
  PENALTY_LABELS,
  isCuratorRole, statusChangePenaltyReason, issuePenaltyToList,
} from "@/lib/types";

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

  const isCuratorOrAdmin = isCuratorRole(viewerRole) || viewerRole === "admin";
  const isLeaderOfOrg    = viewerRole === "leader" && org.leaderId === viewerId;
  const canManage        = isCuratorOrAdmin || isLeaderOfOrg;

  if (viewerRole === "leader" && !isLeaderOfOrg) {
    return (
      <div className="hud-panel p-10 text-center space-y-3">
        <Icon name="ShieldOff" size={32} className="text-red-800 mx-auto" />
        <div className="font-hud text-sm text-red-700">Доступ запрещён</div>
        <div className="font-mono-hud text-xs text-purple-900">Вы не являетесь лидером этой организации</div>
      </div>
    );
  }

  const members          = allPlayers.filter(p => org.memberIds.includes(p.id));
  const onlineCount      = members.filter(p => p.status === "online").length;
  const afkCount         = members.filter(p => p.status === "afk").length;
  const orgRanks         = org.orgRanks ?? [];
  const memberRanks      = org.memberRanks ?? {};

  const notMembers = allPlayers.filter(p =>
    !org.memberIds.includes(p.id) &&
    p.id !== org.leaderId &&
    (addSearch === "" || p.username.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const handleRemoveFromOrg = (playerId: number) => {
    const newMemberRanks = { ...memberRanks };
    delete newMemberRanks[playerId];
    onUpdate({ ...org, memberIds: org.memberIds.filter(id => id !== playerId), memberRanks: newMemberRanks });
  };

  const handleAdd = (playerId: number) => {
    if (org.memberIds.includes(playerId)) return;
    onUpdate({ ...org, memberIds: [...org.memberIds, playerId] });
    setAddSearch("");
  };

  const handleRankAssign = (playerId: number, rankId: number | null) => {
    const newMemberRanks = { ...memberRanks };
    if (rankId === null) delete newMemberRanks[playerId];
    else newMemberRanks[playerId] = rankId;
    onUpdate({ ...org, memberRanks: newMemberRanks });
  };

  const handleRanksChange = (newRanks: OrgRank[]) => {
    const deletedIds = orgRanks.filter(r => !newRanks.find(nr => nr.id === r.id)).map(r => r.id);
    const newMemberRanks = { ...memberRanks };
    deletedIds.forEach(id => {
      Object.keys(newMemberRanks).forEach(pid => {
        if (newMemberRanks[Number(pid)] === id) delete newMemberRanks[Number(pid)];
      });
    });
    onUpdate({ ...org, orgRanks: newRanks, memberRanks: newMemberRanks });
  };

  const handleStatusChange = (playerId: number, fromStatus: Status, toStatus: Status) => {
    if (fromStatus === toStatus) return;
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    const shouldPunish = toStatus === "offline" && (fromStatus === "online" || fromStatus === "afk");

    if (shouldPunish) {
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
        handleRemoveFromOrg(playerId);
        const history = newPenalties.filter(p => p.isActive)
          .map(p => `• ${PENALTY_LABELS[p.type]}: ${p.reason}`)
          .join("\n");
        onNotify?.({ text: `📋 История взысканий ${player.username}:\n${history}`, type: "info", timestamp: new Date().toISOString() });
      }
    } else {
      onPlayerUpdate?.(playerId, { status: toStatus });
    }
  };

  const handlePenaltyUpdate = (playerId: number, penalties: Penalty[], excluded: boolean) => {
    const player = allPlayers.find(p => p.id === playerId);
    onPlayerUpdate?.(playerId, { penalties, warnings: penalties.filter(p => p.isActive).length });
    if (excluded && player) {
      handleRemoveFromOrg(playerId);
      const history = penalties.filter(p => p.isActive)
        .map(p => `• ${PENALTY_LABELS[p.type]}: ${p.reason}`)
        .join("\n");
      onNotify?.({ text: `🚫 ${player.username} исключён после 3 выговоров`, type: "excluded", timestamp: new Date().toISOString() });
      onNotify?.({ text: `📋 История взысканий ${player.username}:\n${history}`, type: "info", timestamp: new Date().toISOString() });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <OrgDetailHeader
        org={org}
        members={members}
        viewerRole={viewerRole}
        onBack={onBack}
      />

      <OrgRanksPanel
        ranks={orgRanks}
        canEdit={canManage}
        onChange={handleRanksChange}
      />

      <OrgMemberList
        org={org}
        members={members}
        canManage={canManage}
        issuerName={viewerName}
        onlineCount={onlineCount}
        afkCount={afkCount}
        onRemoveFromOrg={handleRemoveFromOrg}
        onPenaltyUpdate={handlePenaltyUpdate}
        onStatusChange={handleStatusChange}
        onRankAssign={handleRankAssign}
      />

      {canManage && (
        <OrgAddMember
          addSearch={addSearch}
          notMembers={notMembers}
          onSearchChange={setAddSearch}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
