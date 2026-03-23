import Icon from "@/components/ui/icon";
import OrgDetail from "@/components/shared/OrgDetail";
import { CreateOrgForm } from "@/components/hud/AdminForms";
import { AuthUser, Player, Organization, Notification, Role } from "@/lib/types";

interface OrgListProps {
  viewerRole: Role;
  authUser: AuthUser;
  players: Player[];
  orgs: Organization[];
  visibleOrgs: Organization[];
  selectedOrgId: number | null;
  myOrg: Organization | null;
  onSetSelectedOrgId: (id: number | null) => void;
  onUpdateOrg: (org: Organization) => void;
  onDeleteOrg?: (id: number) => void;
  onUpdatePlayer: (id: number, fields: Partial<Player>) => void;
  onNotify: (note: Omit<Notification, "id" | "read">) => void;
  onOrgCreated: (org: Organization) => void;
}

export default function OrgList({
  viewerRole, authUser, players, orgs, visibleOrgs, selectedOrgId,
  onSetSelectedOrgId, onUpdateOrg, onDeleteOrg, onUpdatePlayer, onNotify, onOrgCreated,
}: OrgListProps) {
  if (selectedOrgId !== null) {
    return (
      <OrgDetail
        org={orgs.find(o => o.id === selectedOrgId)!}
        allPlayers={players}
        viewerRole={viewerRole}
        viewerName={authUser.username}
        viewerId={authUser.id}
        onBack={() => onSetSelectedOrgId(null)}
        onUpdate={onUpdateOrg}
        onDelete={onDeleteOrg}
        onPlayerUpdate={onUpdatePlayer}
        onNotify={onNotify}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="font-hud text-sm tracking-wider text-purple-400">ОРГАНИЗАЦИИ</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleOrgs.map(org => {
          const orgMembers = players.filter(p => org.memberIds.includes(p.id));
          const onlineCnt  = orgMembers.filter(p => p.status === "online").length;
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
        {visibleOrgs.length === 0 && (
          <div className="md:col-span-2 hud-panel p-10 text-center font-mono-hud text-xs text-purple-800">
            {viewerRole === "curator_faction"
              ? "Нет закреплённых организаций. Попросите куратора прикрепить вас к организации."
              : "Организаций пока нет"}
          </div>
        )}
      </div>
      {viewerRole === "curator" && <CreateOrgForm players={players} onCreated={onOrgCreated} />}
    </div>
  );
}
