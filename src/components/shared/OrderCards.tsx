import Icon from "@/components/ui/icon";
import { RoleBadge } from "@/components/shared/PlayerRow";
import { Order, ROLE_LABELS } from "@/lib/types";

// ─── OrderBubble — компактная карточка для хедера ─────────────
export function OrderBubble({ order, isMine, canSeeValidation }: {
  order: Order; isMine: boolean; canSeeValidation: boolean;
}) {
  const time = new Date(order.issuedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
      <div className="w-6 h-6 rounded-lg bg-violet-900/50 border border-violet-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon name="User" size={11} className="text-violet-400" />
      </div>
      <div className={`max-w-[85%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-1.5 text-[10px] font-mono-hud text-purple-700 ${isMine ? "flex-row-reverse" : ""}`}>
          <span>{order.issuedBy}</span>
          <span className="text-purple-900">·</span>
          <span>{ROLE_LABELS[order.issuedByRole]}</span>
          <span className="text-purple-900">·</span>
          <span>{time}</span>
        </div>
        <div className={`rounded-xl border p-2.5 space-y-1.5 text-[11px] ${
          isMine ? "bg-violet-900/25 border-violet-700/30 rounded-tr-sm" : "bg-purple-900/25 border-purple-800/30 rounded-tl-sm"
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rank-badge font-hud text-[10px] px-2 py-0.5 text-violet-200 tracking-widest">№ {order.number}</span>
            {canSeeValidation && (
              order.valid
                ? <span className="text-[10px] font-mono-hud text-emerald-400 flex items-center gap-1"><Icon name="CheckCircle" size={9} />ок</span>
                : <span className="text-[10px] font-mono-hud text-red-400 flex items-center gap-1"><Icon name="AlertCircle" size={9} />ошибка</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-purple-400">
            <Icon name="User" size={10} className="text-purple-600 flex-shrink-0" />
            <span className="font-mono-hud">{order.targetName}</span>
          </div>
          <div className="font-mono-hud text-purple-200 leading-snug">{order.comment}</div>
          {canSeeValidation && !order.valid && order.validationError && (
            <div className="flex items-start gap-1 pt-1.5 border-t border-red-800/30 text-red-400/80">
              <Icon name="AlertTriangle" size={9} className="flex-shrink-0 mt-0.5" />
              <span className="text-[10px] font-mono-hud">{order.validationError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── OrderMessage — полная карточка для вкладки Приказная ─────
export function OrderMessage({ order, isMine, canSeeValidation }: {
  order: Order; isMine: boolean; canSeeValidation: boolean;
}) {
  const date    = new Date(order.issuedAt);
  const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

  return (
    <div className={`flex gap-3 animate-fade-in ${isMine ? "flex-row-reverse" : ""}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-700/50 to-purple-900/50 border border-violet-600/30 flex items-center justify-center mt-0.5">
        <Icon name="User" size={14} className="text-violet-300" />
      </div>
      <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
          <span className="font-hud text-xs text-purple-300">{order.issuedBy}</span>
          <RoleBadge role={order.issuedByRole} />
          <span className="text-[10px] font-mono-hud text-purple-900">{dateStr} {timeStr}</span>
        </div>
        <div className={`rounded-2xl border p-3.5 space-y-2.5 ${
          isMine
            ? "bg-violet-900/25 border-violet-700/30 rounded-tr-sm"
            : "bg-purple-900/20 border-purple-800/30 rounded-tl-sm"
        }`}>
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
          <div className="flex items-center gap-2">
            <Icon name="User" size={11} className="text-purple-600 flex-shrink-0" />
            <span className="text-[11px] font-mono-hud text-purple-300">{order.targetName}</span>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="MessageSquare" size={11} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <span className="text-[12px] font-mono-hud text-purple-200 leading-relaxed">{order.comment}</span>
          </div>
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
