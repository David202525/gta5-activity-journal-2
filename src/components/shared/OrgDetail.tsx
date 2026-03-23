import { useState } from "react";
import Icon from "@/components/ui/icon";
import OrgRanksPanel from "@/components/shared/OrgRanksPanel";
import OrgDetailHeader from "./OrgDetailHeader";
import OrgMemberList from "./OrgMemberList";
import OrgAddMember from "./OrgAddMember";
import {
  Organization, OrgRank, Player, Role, Status, Penalty, Notification,
  PENALTY_LABELS,
  isCuratorRole, statusChangePenaltyReason, issuePenaltyToList, ROLE_LABELS,
} from "@/lib/types";

// ─── NORM EDITOR ─────────────────────────────────────────────
function NormEditor({ org, onUpdate }: { org: Organization; onUpdate: (o: Organization) => void }) {
  const [daily, setDaily]   = useState(String(org.dailyNorm ?? ""));
  const [weekly, setWeekly] = useState(String(org.weeklyNorm ?? ""));

  const save = () => {
    onUpdate({
      ...org,
      dailyNorm:  daily  ? parseInt(daily)  : undefined,
      weeklyNorm: weekly ? parseInt(weekly) : undefined,
    });
  };

  const inputCls = "w-20 border border-purple-800/40 text-purple-100 text-xs px-2 py-1.5 rounded-lg font-mono-hud focus:outline-none bg-transparent focus:border-violet-600/50 transition-all";

  return (
    <div className="hud-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Clock" size={13} className="text-amber-400" />
        <span className="font-hud text-xs tracking-widest text-purple-400/80">НОРМЫ ОНЛАЙНА</span>
        <span className="text-[10px] font-mono-hud text-purple-800 ml-auto">не касается лидера и зама</span>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-hud text-purple-600">ДНЕВНАЯ (мин):</span>
          <input value={daily} onChange={e => setDaily(e.target.value.replace(/\D/g, ""))}
            placeholder="60" className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-hud text-purple-600">НЕДЕЛЬНАЯ (мин):</span>
          <input value={weekly} onChange={e => setWeekly(e.target.value.replace(/\D/g, ""))}
            placeholder="300" className={inputCls} />
        </div>
        <button onClick={save}
          className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-amber-900/20 border border-amber-700/30 text-amber-400 rounded-lg hover:bg-amber-800/30 transition-all">
          СОХРАНИТЬ
        </button>
        {(org.dailyNorm || org.weeklyNorm) && (
          <div className="text-[10px] font-mono-hud text-purple-700">
            {org.dailyNorm ? `Дн: ${org.dailyNorm}м` : ""} {org.weeklyNorm ? `Нед: ${org.weeklyNorm}м` : ""}
          </div>
        )}
      </div>
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
  onDelete?: (id: number) => void;
  onPlayerUpdate?: (id: number, fields: Partial<Player>) => void;
  onNotify?: (note: Omit<Notification, "id" | "read">) => void;
}

export default function OrgDetail({
  org, allPlayers, viewerRole, viewerName, viewerId,
  onBack, onUpdate, onDelete, onPlayerUpdate, onNotify,
}: OrgDetailProps) {
  const [addSearch, setAddSearch] = useState("");

  const isCuratorOrAdmin = isCuratorRole(viewerRole) || viewerRole === "admin";
  const isLeaderOfOrg    = viewerRole === "leader" && org.leaderId === viewerId;
  const isDeputyOfOrg    = viewerRole === "deputy" && org.memberIds.includes(viewerId);
  const canManage        = isCuratorOrAdmin || isLeaderOfOrg || isDeputyOfOrg;
  // user — только чтение, без управления

  const isOrgMember = viewerRole === "user" && org.memberIds.includes(viewerId);

  if ((viewerRole === "leader" && !isLeaderOfOrg) || (viewerRole === "deputy" && !isDeputyOfOrg)) {
    return (
      <div className="hud-panel p-10 text-center space-y-3">
        <Icon name="ShieldOff" size={32} className="text-red-800 mx-auto" />
        <div className="font-hud text-sm text-red-700">Доступ запрещён</div>
        <div className="font-mono-hud text-xs text-purple-900">Вы не являетесь членом этой организации</div>
      </div>
    );
  }

  if (viewerRole === "user" && !isOrgMember) {
    return (
      <div className="hud-panel p-10 text-center space-y-3">
        <Icon name="ShieldOff" size={32} className="text-red-800 mx-auto" />
        <div className="font-hud text-sm text-red-700">Доступ запрещён</div>
        <div className="font-mono-hud text-xs text-purple-900">Вы не состоите в этой организации</div>
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
        onUpdate={canManage ? onUpdate : undefined}
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

      {/* Норма онлайна — лидер и куратор могут устанавливать */}
      {canManage && (
        <NormEditor org={org} onUpdate={onUpdate} />
      )}

      {/* Закрепить куратора + удалить организацию — только главный куратор */}
      {viewerRole === "curator" && (
        <div className="hud-panel p-4 space-y-4">
          {/* Куратор организации */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Icon name="ShieldCheck" size={13} className="text-pink-400" />
              <span className="font-hud text-xs tracking-widest text-purple-400/80">КУРАТОР ОРГАНИЗАЦИИ</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onUpdate({ ...org, curatorId: null })}
                className={`btn-hud text-[10px] font-hud px-3 py-1.5 rounded-lg border transition-all ${
                  !org.curatorId
                    ? "bg-purple-900/40 border-purple-600/50 text-purple-200"
                    : "border-purple-900/30 text-purple-700 hover:text-purple-400"
                }`}>
                Не назначен
              </button>
              {allPlayers.filter(p => p.role === "curator_faction").length === 0 && (
                <span className="text-[10px] font-mono-hud text-purple-800 self-center">
                  Нет кураторов фракций — назначьте роль в Панели
                </span>
              )}
              {allPlayers.filter(p => p.role === "curator_faction").map(p => (
                <button key={p.id}
                  onClick={() => onUpdate({ ...org, curatorId: p.id })}
                  className={`btn-hud text-[10px] font-hud px-3 py-1.5 rounded-lg border transition-all ${
                    org.curatorId === p.id
                      ? "bg-cyan-900/40 border-cyan-600/50 text-cyan-200"
                      : "border-cyan-900/30 text-cyan-800 hover:text-cyan-400 hover:border-cyan-700/40"
                  }`}>
                  {p.username}
                </button>
              ))}
            </div>
            {org.curatorId && (
              <div className="text-[10px] font-mono-hud text-cyan-600 mt-2">
                Закреплён: {allPlayers.find(p => p.id === org.curatorId)?.username ?? "—"}
              </div>
            )}
          </div>

          {/* Удалить организацию */}
          {onDelete && (
            <div className="pt-3 border-t border-purple-900/30">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Trash2" size={13} className="text-red-500" />
                <span className="font-hud text-xs tracking-widest text-red-500/70">УДАЛИТЬ ОРГАНИЗАЦИЮ</span>
              </div>
              <DeleteOrgButton orgName={org.name} onConfirm={() => { onDelete(org.id); onBack(); }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DELETE CONFIRM ───────────────────────────────────────────
function DeleteOrgButton({ orgName, onConfirm }: { orgName: string; onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)}
        className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-red-900/20 border border-red-700/30 text-red-400 rounded-lg hover:bg-red-800/30 transition-all">
        УДАЛИТЬ «{orgName}»
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-mono-hud text-red-400">Уверен? Это нельзя отменить.</span>
      <button onClick={onConfirm}
        className="btn-hud text-[10px] font-hud px-3 py-1.5 bg-red-800/40 border border-red-600/50 text-red-300 rounded-lg hover:bg-red-700/50 transition-all">
        ДА, УДАЛИТЬ
      </button>
      <button onClick={() => setConfirm(false)}
        className="text-[10px] text-purple-700 hover:text-purple-400 transition-colors px-1">
        отмена
      </button>
    </div>
  );
}