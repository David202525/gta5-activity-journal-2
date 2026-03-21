import Icon from "@/components/ui/icon";
import { RoleBadge } from "@/components/shared/PlayerRow";
import { AuthUser, Notification, Role } from "@/lib/types";

interface AppHeaderProps {
  authUser: AuthUser;
  viewerRole: Role;
  onlinePlayers: number;
  afkPlayers: number;
  isMock: boolean;
  notifications: Notification[];
  showNotifications: boolean;
  onToggleNotifications: () => void;
  onMarkAllRead: () => void;
  onLogout: () => void;
}

export default function AppHeader({
  authUser, viewerRole, onlinePlayers, afkPlayers, isMock,
  notifications, showNotifications, onToggleNotifications, onMarkAllRead, onLogout,
}: AppHeaderProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="border-b border-purple-900/50 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.4)]">
            <Icon name="Zap" size={16} className="text-white" />
          </div>
          <div>
            <div className="font-hud text-sm tracking-widest gradient-text leading-none">АФК ЖУРНАЛ</div>
            <div className="font-mono-hud text-[9px] text-purple-800 tracking-widest">GTA ACTIVITY HUB</div>
          </div>
        </div>

        {/* Center status */}
        <div className="hidden sm:flex items-center gap-4">
          {isMock && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25">
              <Icon name="WifiOff" size={11} className="text-amber-400" />
              <span className="font-mono-hud text-[10px] text-amber-400">МОК-РЕЖИМ</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-online" />
            <span className="font-mono-hud text-xs text-purple-500">{onlinePlayers} онлайн</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 dot-afk" />
            <span className="font-mono-hud text-xs text-purple-500">{afkPlayers} АФК</span>
          </div>
          <span className="font-mono-hud text-xs text-purple-800">
            {new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Right: user + bell + logout */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <div className="font-hud text-xs text-purple-200">{authUser.username}</div>
            <RoleBadge role={viewerRole} />
          </div>

          {/* Колокол уведомлений */}
          {(viewerRole === "leader" || viewerRole === "admin" || viewerRole === "curator") && (
            <div className="relative">
              <button onClick={onToggleNotifications}
                className="w-9 h-9 rounded-xl bg-white/4 border border-purple-900/60 flex items-center justify-center hover:border-violet-600/40 hover:bg-violet-900/20 transition-all relative">
                <Icon name="Bell" size={14} className="text-purple-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center font-hud text-[9px] text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && notifications.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#110d1e] border border-purple-700/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden z-50">
                  <div className="px-4 py-2.5 border-b border-purple-900/40 flex items-center justify-between">
                    <span className="font-hud text-xs tracking-widest text-purple-400">УВЕДОМЛЕНИЯ</span>
                    <button onClick={onMarkAllRead}
                      className="text-[10px] font-mono-hud text-purple-700 hover:text-purple-400">
                      прочитать все
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-purple-900/20 last:border-0 ${!n.read ? "bg-purple-900/15" : ""}`}>
                        <div className="text-xs font-mono-hud text-purple-300 leading-relaxed">{n.text}</div>
                        <div className="text-[10px] text-purple-800 mt-1">
                          {new Date(n.timestamp).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={onLogout}
            className="w-9 h-9 rounded-xl bg-white/4 border border-purple-900/60 flex items-center justify-center hover:border-red-500/40 hover:bg-red-500/10 transition-all group">
            <Icon name="LogOut" size={14} className="text-purple-700 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>
    </header>
  );
}
