import Icon from "@/components/ui/icon";
import { Organization, Player, Role, formatTime } from "@/lib/types";
import { RoleBadge } from "./PlayerRow";

interface OrgDetailHeaderProps {
  org: Organization;
  members: Player[];
  viewerRole: Role;
  onBack: () => void;
}

export default function OrgDetailHeader({ org, members, viewerRole, onBack }: OrgDetailHeaderProps) {
  const onlineCount      = members.filter(p => p.status === "online").length;
  const afkCount         = members.filter(p => p.status === "afk").length;
  const totalOnlineToday = members.reduce((s, p) => s + p.onlineToday, 0);

  return (
    <>
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
          { label: "УЧАСТНИКОВ",   val: String(members.length),       icon: "Users",     cls: "text-purple-300" },
          { label: "ОНЛАЙН",       val: String(onlineCount),          icon: "Wifi",      cls: "text-emerald-400" },
          { label: "АФК",          val: String(afkCount),             icon: "Clock",     cls: "text-amber-400" },
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
    </>
  );
}
