import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { OrderMessage } from "@/components/shared/OrderCards";
import { validateOrderNumber, ORDER_PREFIX_LABELS } from "@/lib/orderUtils";
import { AuthUser, Order, Player, Role, ROLE_LABELS, Notification } from "@/lib/types";

// ─── Форма нового приказа ─────────────────────────────────────
interface OrderFormProps {
  authUser: AuthUser;
  players: Player[];
  orders: Order[];
  onSubmit: (order: Order) => void;
}

function OrderForm({ authUser, players, orders, onSubmit }: OrderFormProps) {
  const [number, setNumber]     = useState("");
  const [targetName, setTarget] = useState("");
  const [comment, setComment]   = useState("");
  const [sending, setSending]   = useState(false);

  const canSend = number.trim() && targetName.trim() && comment.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    const { valid, error: valErr } = validateOrderNumber(number, orders);
    const order: Order = {
      id: Date.now(),
      number: number.trim().toUpperCase(),
      targetName: targetName.trim(),
      comment: comment.trim(),
      issuedBy: authUser.username,
      issuedByRole: authUser.role,
      issuedAt: new Date().toISOString(),
      valid,
      validationError: valErr,
    };
    setTimeout(() => {
      onSubmit(order);
      setNumber(""); setTarget(""); setComment(""); setSending(false);
    }, 300);
  };

  const inputCls = "w-full border border-purple-800/40 text-purple-100 text-sm px-3 py-2 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/50 bg-transparent focus:border-violet-600/50 transition-all text-[12px]";

  return (
    <form onSubmit={handleSubmit} className="hud-panel p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="FilePlus" size={13} className="text-violet-400" />
        <span className="font-hud text-xs tracking-widest text-purple-400/80">НОВЫЙ ПРИКАЗ</span>
        <span className="ml-auto text-[10px] font-mono-hud text-purple-800">Формат: ГГГГ-ПЧ-НН</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-hud tracking-widest text-purple-600 block mb-1">№ ПРИКАЗА</label>
          <input value={number} onChange={e => setNumber(e.target.value)}
            placeholder="2026-ФР-01" maxLength={12} className={inputCls} />
        </div>
        <div>
          <label className="text-[10px] font-hud tracking-widest text-purple-600 block mb-1">СОТРУДНИК</label>
          <input value={targetName} onChange={e => setTarget(e.target.value)}
            placeholder="Имя_игрока" maxLength={32} list="tab-players-list" className={inputCls} />
          <datalist id="tab-players-list">
            {players.map(p => <option key={p.id} value={p.username} />)}
          </datalist>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-hud tracking-widest text-purple-600 block mb-1">КОММЕНТАРИЙ</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Содержание приказа..." maxLength={300} rows={2}
          className={`${inputCls} resize-none leading-snug`} />
      </div>
      <button type="submit" disabled={!canSend || sending}
        className="btn-hud w-full font-hud text-[11px] tracking-widest py-2.5 text-white rounded-xl disabled:opacity-40 transition-all"
        style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}>
        {sending ? "ОТПРАВКА..." : "ИЗДАТЬ ПРИКАЗ"}
      </button>
    </form>
  );
}

// ─── TAB ORDERS ───────────────────────────────────────────────
interface TabOrdersProps {
  authUser: AuthUser;
  viewerRole: Role;
  players: Player[];
  orders: Order[];
  onAddOrder: (order: Order) => void;
  onDeleteOrder?: (id: number) => void;
  onNotify: (note: Omit<Notification, "id" | "read">) => void;
}

export default function TabOrders({ authUser, viewerRole, players, orders, onAddOrder, onDeleteOrder, onNotify }: TabOrdersProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const canPost           = viewerRole === "leader" || viewerRole === "deputy" || viewerRole === "curator" || viewerRole === "curator_faction";
  const canSeeValidation  = viewerRole === "curator" || viewerRole === "curator_faction" || viewerRole === "curator_admin";
  const canDelete         = viewerRole === "curator";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orders.length]);

  const handleAdd = (order: Order) => {
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
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Icon name="ScrollText" size={14} className="text-violet-400" />
        <span className="font-hud text-sm tracking-wider text-purple-400">ПРИКАЗНАЯ</span>
        <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/70">{orders.length} приказов</span>
        {canSeeValidation && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-mono-hud text-pink-400">
            <Icon name="Eye" size={10} /> вы видите статус валидации
          </span>
        )}
      </div>

      <div className="hud-panel p-4 min-h-[280px] max-h-[480px] overflow-y-auto flex flex-col gap-4 scrollbar-thin scrollbar-thumb-purple-800/40 scrollbar-track-transparent">
        {orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <Icon name="ScrollText" size={32} className="text-purple-900" />
            <div className="font-hud text-sm text-purple-800">Приказов пока нет</div>
            <div className="font-mono-hud text-xs text-purple-900">Первый приказ появится здесь</div>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="relative group">
              <OrderMessage
                order={order}
                isMine={order.issuedBy === authUser.username}
                canSeeValidation={canSeeValidation}
              />
              {canDelete && (
                <button onClick={() => onDeleteOrder?.(order.id)}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity btn-hud text-[9px] font-hud px-2 py-1 bg-red-900/30 border border-red-700/40 text-red-400 rounded-lg hover:bg-red-800/40">
                  УДАЛИТЬ
                </button>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="hud-panel px-4 py-3 flex flex-wrap gap-3 items-center">
        <Icon name="Info" size={11} className="text-purple-700" />
        <span className="text-[10px] font-hud tracking-widest text-purple-700">КОДЫ ПОДРАЗДЕЛЕНИЙ:</span>
        {Object.entries(ORDER_PREFIX_LABELS).map(([code, label]) => (
          <span key={code} className="text-[10px] font-mono-hud text-purple-600">
            <span className="text-violet-400">{code}</span> — {label}
          </span>
        ))}
      </div>

      {canPost ? (
        <OrderForm authUser={authUser} players={players} orders={orders} onSubmit={handleAdd} />
      ) : (
        <div className="hud-panel p-6 text-center space-y-2">
          <Icon name="Lock" size={20} className="text-purple-800 mx-auto" />
          <div className="font-hud text-sm text-purple-700">Нет прав на издание приказов</div>
          <div className="font-mono-hud text-xs text-purple-900">Доступно лидерам и заместителям</div>
        </div>
      )}
    </div>
  );
}
