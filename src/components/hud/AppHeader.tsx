import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { RoleBadge } from "@/components/shared/PlayerRow";
import { OrderBubble } from "@/components/shared/OrderCards";
import { AuthUser, Notification, Order, Player, Role, ROLE_LABELS, isCuratorRole } from "@/lib/types";
import { validateOrderNumber, ORDER_PREFIXES, ORDER_PREFIX_LABELS } from "@/lib/orderUtils";

// ─── Мини-форма приказа для хедера ───────────────────────────
function OrderForm({ authUser, players, orders, onSubmit }: {
  authUser: AuthUser; players: Player[]; orders: Order[];
  onSubmit: (o: Order) => void;
}) {
  const [number, setNumber]   = useState("");
  const [target, setTarget]   = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = number.trim() && target.trim() && comment.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    const { valid, error } = validateOrderNumber(number, orders);
    const order: Order = {
      id: Date.now(),
      number: number.trim().toUpperCase(),
      targetName: target.trim(),
      comment: comment.trim(),
      issuedBy: authUser.username,
      issuedByRole: authUser.role,
      issuedAt: new Date().toISOString(),
      valid, validationError: error,
    };
    setTimeout(() => {
      onSubmit(order);
      setNumber(""); setTarget(""); setComment(""); setSending(false);
    }, 200);
  };

  const inp = "w-full border border-purple-800/40 text-purple-100 text-[11px] px-2.5 py-1.5 rounded-lg font-mono-hud focus:outline-none placeholder:text-purple-900/50 bg-transparent focus:border-violet-600/50 transition-all";

  return (
    <form onSubmit={handleSubmit} className="border-t border-purple-900/40 p-3 space-y-2">
      <div className="text-[10px] font-hud tracking-widest text-purple-600 mb-1">НОВЫЙ ПРИКАЗ</div>
      <div className="grid grid-cols-2 gap-2">
        <input value={number} onChange={e => setNumber(e.target.value)}
          placeholder="2026-ФР-01" maxLength={12} className={inp} />
        <input value={target} onChange={e => setTarget(e.target.value)}
          placeholder="Сотрудник" maxLength={32} list="hdr-players-list" className={inp} />
        <datalist id="hdr-players-list">
          {players.map(p => <option key={p.id} value={p.username} />)}
        </datalist>
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Комментарий к приказу..." maxLength={200} rows={2}
        className={`${inp} resize-none leading-snug`} />
      <button type="submit" disabled={!canSend || sending}
        className="btn-hud w-full font-hud text-[10px] tracking-widest py-2 text-white rounded-lg disabled:opacity-40 transition-all"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 3px 12px rgba(124,58,237,.4)" }}>
        {sending ? "..." : "ИЗДАТЬ ПРИКАЗ"}
      </button>
    </form>
  );
}

// ─── APP HEADER ───────────────────────────────────────────────
interface AppHeaderProps {
  authUser: AuthUser;
  viewerRole: Role;
  players: Player[];
  orders: Order[];
  onAddOrder: (o: Order) => void;
  onlinePlayers: number;
  afkPlayers: number;
  isMock: boolean;
  notifications: Notification[];
  showNotifications: boolean;
  onToggleNotifications: () => void;
  onMarkAllRead: () => void;
  onLogout: () => void;
  onNotify: (note: Omit<Notification, "id" | "read">) => void;
}

export default function AppHeader({
  authUser, viewerRole, players, orders, onAddOrder,
  onlinePlayers, afkPlayers, isMock,
  notifications, showNotifications, onToggleNotifications, onMarkAllRead, onLogout,
  onNotify,
}: AppHeaderProps) {
  const unreadCount   = notifications.filter(n => !n.read).length;
  const [showOrders, setShowOrders] = useState(false);
  const ordersRef = useRef<HTMLDivElement>(null);
  const feedRef   = useRef<HTMLDivElement>(null);

  const canSeeOrders     = viewerRole === "leader" || viewerRole === "deputy" || isCuratorRole(viewerRole);
  const canPostOrders    = viewerRole === "leader" || viewerRole === "deputy" || isCuratorRole(viewerRole);
  const canSeeValidation = isCuratorRole(viewerRole);

  useEffect(() => {
    if (!showOrders) return;
    const h = (e: MouseEvent) => { if (!ordersRef.current?.contains(e.target as Node)) setShowOrders(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showOrders]);

  useEffect(() => {
    if (showOrders && feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [showOrders, orders.length]);

  const handleAddOrder = (order: Order) => {
    onAddOrder(order);
    if (!order.valid && canSeeValidation) {
      onNotify({
        type: "warning",
        text: `Приказ №${order.number} от ${order.issuedBy} (${ROLE_LABELS[order.issuedByRole]}): ошибка — ${order.validationError}`,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      });
    }
  };

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

        {/* Center */}
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

          {/* Кнопка Приказная */}
          {canSeeOrders && (
            <div ref={ordersRef} className="relative">
              <button onClick={() => setShowOrders(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-hud text-[10px] tracking-wider transition-all ${
                  showOrders
                    ? "bg-violet-700/30 border-violet-600/50 text-violet-200"
                    : "bg-white/4 border-purple-900/60 text-purple-500 hover:border-violet-600/40 hover:text-violet-300"
                }`}>
                <Icon name="ScrollText" size={11} />
                ПРИКАЗНАЯ
                {orders.length > 0 && (
                  <span className="bg-violet-700/50 text-violet-200 text-[9px] font-hud px-1.5 rounded-full">{orders.length}</span>
                )}
              </button>

              {showOrders && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-96 bg-[#0e0a1a] border border-purple-700/50 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] overflow-hidden z-50 flex flex-col"
                  style={{ maxHeight: "480px" }}>

                  <div className="px-4 py-2.5 border-b border-purple-900/40 flex items-center gap-2">
                    <Icon name="ScrollText" size={12} className="text-violet-400" />
                    <span className="font-hud text-xs tracking-widest text-purple-400">ПРИКАЗНАЯ</span>
                    <span className="font-mono-hud text-[10px] text-purple-800">{orders.length} приказов</span>
                    <button onClick={() => setShowOrders(false)} className="ml-auto text-purple-800 hover:text-purple-400 transition-colors">
                      <Icon name="X" size={13} />
                    </button>
                  </div>

                  <div ref={feedRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-purple-800/40 scrollbar-track-transparent"
                    style={{ minHeight: "120px", maxHeight: "280px" }}>
                    {orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-8">
                        <Icon name="ScrollText" size={24} className="text-purple-900" />
                        <span className="font-mono-hud text-xs text-purple-800">Приказов пока нет</span>
                      </div>
                    ) : (
                      orders.map(order => (
                        <OrderBubble key={order.id} order={order}
                          isMine={order.issuedBy === authUser.username}
                          canSeeValidation={canSeeValidation} />
                      ))
                    )}
                  </div>

                  <div className="px-3 py-1.5 bg-purple-950/40 border-t border-purple-900/30 flex flex-wrap gap-x-3 gap-y-0.5">
                    {Object.entries(ORDER_PREFIX_LABELS).map(([code, label]) => (
                      <span key={code} className="text-[9px] font-mono-hud text-purple-800">
                        <span className="text-violet-600">{code}</span> {label}
                      </span>
                    ))}
                  </div>

                  {canPostOrders && (
                    <OrderForm authUser={authUser} players={players} orders={orders} onSubmit={handleAddOrder} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: user + bell + logout */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <div className="font-hud text-xs text-purple-200">{authUser.username}</div>
            <RoleBadge role={viewerRole} />
          </div>

          {(viewerRole === "leader" || viewerRole === "deputy" || viewerRole === "admin" || isCuratorRole(viewerRole)) && (
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
                    <button onClick={onMarkAllRead} className="text-[10px] font-mono-hud text-purple-700 hover:text-purple-400">
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
