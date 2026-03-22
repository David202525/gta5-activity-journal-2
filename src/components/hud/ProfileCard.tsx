import Icon from "@/components/ui/icon";
import { RoleBadge, XPBar } from "@/components/shared/PlayerRow";
import { AuthUser, Role, Status, STATUS_COLORS, STATUS_LABELS, Tab } from "@/lib/types";

interface ProfileCardProps {
  authUser: AuthUser;
  viewerRole: Role;
  myStatus: Status;
  onStatusChange: (s: Status) => void;
}

export function ProfileCard({ authUser, viewerRole, myStatus, onStatusChange }: ProfileCardProps) {
  return (
    <div className="hud-panel p-4 mb-5 animate-fade-in">
      {/* Top row: avatar + info + role badge */}
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-700/50 to-purple-900/50 border border-violet-600/30 flex items-center justify-center">
            <Icon name="User" size={22} className="text-violet-300" />
          </div>
          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#09060f] ${STATUS_COLORS[myStatus]}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-hud text-lg tracking-wide gradient-text truncate">{authUser.username}</div>
            <RoleBadge role={viewerRole} />
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/80">РАНГ {authUser.rank}</span>
            <span className="text-xs text-purple-600 font-mono-hud">{authUser.title}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <XPBar value={authUser.xp} max={authUser.xpMax} color="xp-bar" />
            <span className="text-[10px] font-mono-hud text-purple-600 whitespace-nowrap">LVL {authUser.level}</span>
          </div>
        </div>
      </div>

      {/* Bottom row: status buttons */}
      <div className="mt-4 flex items-center gap-3">
        <div className="text-[10px] font-hud tracking-widest text-purple-700 uppercase whitespace-nowrap">Мой статус</div>
        <div className="flex gap-2">
          {(["online", "afk", "offline"] as Status[]).map(s => (
            <button key={s} onClick={() => onStatusChange(s)}
              className={`btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                myStatus === s
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
    </div>
  );
}

interface TabBarProps {
  tabs: { id: Tab; label: string; icon: string }[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex gap-1 mb-5 bg-black/20 p-1 rounded-xl border border-purple-900/30 overflow-x-auto">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-hud tracking-wider whitespace-nowrap rounded-lg transition-all flex-1 justify-center ${
            activeTab === tab.id
              ? "bg-violet-700/40 text-violet-200 border border-violet-600/40 shadow-[0_2px_12px_rgba(124,58,237,0.3)]"
              : "text-purple-700 hover:text-purple-400 hover:bg-purple-900/20"
          }`}>
          <Icon name={tab.icon} size={12} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}