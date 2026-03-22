import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { RoleBadge } from "@/components/shared/PlayerRow";
import { AuthUser, Order, Player, Role, ROLE_LABELS, Notification } from "@/lib/types";

// ─── Валидация номера приказа ──────────────────────────────────
// Формат: ГГГГ-ПЧ-NN (например 2026-ФР-01, 2026-АД-12)
// ПЧ = код подразделения: ФР (фракция), АД (администрация), ОБ (общий)
const ORDER_PREFIXES = ["ФР", "АД", "ОБ", "ОП", "ДС"];

function validateOrderNumber(num: string, existingOrders: Order[]): { valid: boolean; error?: string } {
  const trimmed = num.trim().toUpperCase();
  const regex = /^\d{4}-[А-ЯЁA-Z]{2}-\d{2}$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: `Неверный формат. Ожидается: ГГГГ-ПЧ-НН (например 2026-ФР-01)` };
  }
  const [year, prefix] = trimmed.split("-");
  const currentYear = new Date().getFullYear();
  if (parseInt(year) !== currentYear) {
    return { valid: false, error: `Год приказа должен быть ${currentYear}` };
  }
  if (!ORDER_PREFIXES.includes(prefix)) {
    return { valid: false, error: `Неизвестный код подразделения «${prefix}». Допустимые: ${ORDER_PREFIXES.join(", ")}` };
  }
  const duplicate = existingOrders.find(o => o.number.toUpperCase() === trimmed);
  if (duplicate) {
    return { valid: false, error: `Приказ ${trimmed} уже существует` };
  }
  return { valid: true };
}

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
  const [error, setError]       = useState("");
  const [sending, setSending]   = useState(false);

  const canSend = number.trim() && targetName.trim() && comment.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setError("");
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
        <span className="ml-auto text-[10px] font-mono-hud text-purple-800">Формат номера: ГГГГ-ПЧ-НН</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-hud tracking-widest text-purple-600 block mb-1">№ ПРИКАЗА</label>
          <input
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="2026-ФР-01"
            maxLength={12}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-hud tracking-widest text-purple-600 block mb-1">СОТРУДНИК</label>
          <input
            value={targetName}
            onChange={e => setTarget(e.target.value)}
            placeholder="Имя_игрока"
            maxLength={32}
            list="players-list"
            className={inputCls}
          />
          <datalist id="players-list">
            {players.map(p => <option key={p.id} value={p.username} />)}
          </datalist>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-hud tracking-widest text-purple-600 block mb-1">КОММЕНТАРИЙ</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Содержание приказа..."
          maxLength={300}
          rows={2}
          className={`${inputCls} resize-none leading-snug`}
        />
      </div>

      {error && (
        <div className="text-[11px] font-mono-hud text-red-400 flex items-center gap-2">
          <Icon name="AlertCircle" size={11} /> {error}
        </div>
      )}

      <button type="submit" disabled={!canSend || sending}
        className="btn-hud w-full font-hud text-[11px] tracking-widest py-2.5 text-white rounded-xl disabled:opacity-40 transition-all"
        style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}>
        {sending ? "ОТПРАВКА..." : "ИЗДАТЬ ПРИКАЗ"}
      </button>
    </form>
  );
}

// ─── Карточка приказа (сообщение в чате) ─────────────────────
function OrderMessage({ order, isMine, canSeeValidation }: {
  order: Order; isMine: boolean; canSeeValidation: boolean;
}) {
  const date = new Date(order.issuedAt);
  const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

  return (
    <div className={`flex gap-3 animate-fade-in ${isMine ? "flex-row-reverse" : ""}`}>
      {/* Аватар */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-700/50 to-purple-900/50 border border-violet-600/30 flex items-center justify-center mt-0.5">
        <Icon name="User" size={14} className="text-violet-300" />
      </div>

      {/* Контент */}
      <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {/* Шапка */}
        <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
          <span className="font-hud text-xs text-purple-300">{order.issuedBy}</span>
          <RoleBadge role={order.issuedByRole} />
          <span className="text-[10px] font-mono-hud text-purple-900">{dateStr} {timeStr}</span>
        </div>

        {/* Тело приказа */}
        <div className={`rounded-2xl border p-3.5 space-y-2.5 ${
          isMine
            ? "bg-violet-900/25 border-violet-700/30 rounded-tr-sm"
            : "bg-purple-900/20 border-purple-800/30 rounded-tl-sm"
        }`}>
          {/* Номер + статус */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rank-badge font-hud text-[11px] px-2.5 py-0.5 text-violet-200 tracking-widest">
              № {order.number}
            </span>
            {canSeeValidation && (
              order.valid
                ? <span className="flex items-center gap-1 text-[10px] font-mono-hud text-emerald-400">
                    <Icon name="CheckCircle" size={10} /> валидный
                  </span>
                : <span className="flex items-center gap-1 text-[10px] font-mono-hud text-red-400">
                    <Icon name="AlertCircle" size={10} /> ошибка
                  </span>
            )}
          </div>

          {/* Сотрудник */}
          <div className="flex items-center gap-2">
            <Icon name="User" size={11} className="text-purple-600 flex-shrink-0" />
            <span className="text-[11px] font-mono-hud text-purple-300">{order.targetName}</span>
          </div>

          {/* Комментарий */}
          <div className="flex items-start gap-2">
            <Icon name="MessageSquare" size={11} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <span className="text-[12px] font-mono-hud text-purple-200 leading-relaxed">{order.comment}</span>
          </div>

          {/* Сообщение об ошибке валидации (только куратору) */}
          {canSeeValidation && !order.valid && order.validationError && (
            <div className="flex items-start gap-2 pt-2 border-t border-red-800/30">
              <Icon name="AlertTriangle" size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] font-mono-hud text-red-400/80">{order.validationError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
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
  const canPost   = viewerRole === "leader" || viewerRole === "deputy" || viewerRole === "curator" || viewerRole === "curator_faction";
  const canSeeValidation = viewerRole === "curator" || viewerRole === "curator_faction" || viewerRole === "curator_admin";
  const canDelete = viewerRole === "curator";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orders.length]);

  const handleAdd = (order: Order) => {
    onAddOrder(order);
    if (!order.valid && canSeeValidation) {
      onNotify({
        type: "warning",
        text: `Приказ №${order.number} от ${order.issuedBy} (${ROLE_LABELS[order.issuedByRole]}): ошибка номера — ${order.validationError}`,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Заголовок */}
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

      {/* Лента приказов */}
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
                <button
                  onClick={() => onDeleteOrder?.(order.id)}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity btn-hud text-[9px] font-hud px-2 py-1 bg-red-900/30 border border-red-700/40 text-red-400 rounded-lg hover:bg-red-800/40">
                  УДАЛИТЬ
                </button>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Легенда форматов */}
      <div className="hud-panel px-4 py-3 flex flex-wrap gap-3 items-center">
        <Icon name="Info" size={11} className="text-purple-700" />
        <span className="text-[10px] font-hud tracking-widest text-purple-700">КОДЫ ПОДРАЗДЕЛЕНИЙ:</span>
        {[
          { code: "ФР", label: "Фракция" },
          { code: "АД", label: "Администрация" },
          { code: "ОБ", label: "Общий" },
          { code: "ОП", label: "Оперативный" },
          { code: "ДС", label: "Дисциплина" },
        ].map(({ code, label }) => (
          <span key={code} className="text-[10px] font-mono-hud text-purple-600">
            <span className="text-violet-400">{code}</span> — {label}
          </span>
        ))}
      </div>

      {/* Форма (только если есть права) */}
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