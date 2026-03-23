import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { COL_ID_VERBAL } from "@/lib/types";
import { AUTO_COLS } from "./TableTypes";

// ── Penalty Cell ───────────────────────────────────────────────
export function PenaltyCell({ value, colId, canEdit, onSave }: {
  value: string; colId: number; canEdit: boolean; onSave: (v: string, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "reason">("pick");
  const [pending, setPending] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const isVerbal = colId === COL_ID_VERBAL;
  const max = isVerbal ? 2 : 3;
  const num = parseInt(value) || 0;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (step === "reason") setTimeout(() => textRef.current?.focus(), 50);
  }, [step]);

  const close = () => { setOpen(false); setStep("pick"); setPending(null); setReason(""); };
  const pick = (n: number) => {
    if (n === num) { close(); return; }
    if (n === 0) { onSave("0", "Снято"); close(); return; }
    setPending(n); setStep("reason");
  };
  const confirm = () => { if (!reason.trim()) return; onSave(String(pending!), reason.trim()); close(); };
  const clr = num === 0 ? "#666" : (isVerbal ? (num >= 2 ? "#d32f2f" : "#f57f17") : (num >= 3 ? "#d32f2f" : num >= 2 ? "#e65100" : "#f57f17"));

  return (
    <div ref={ref} className="relative w-full h-full flex items-center justify-center select-none">
      <span className="text-[12px] font-mono cursor-pointer"
        style={{ color: clr, fontWeight: num > 0 ? 600 : 400 }}
        onClick={() => canEdit && setOpen(o => !o)}>
        {num === 0 ? "0" : num}
      </span>
      {open && canEdit && (
        <div className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-gray-300 rounded shadow-xl w-52">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
            <span className="text-[11px] font-semibold text-gray-600">
              {isVerbal ? "Уст. предупреждения" : "Выговоры"} (0–{max})
            </span>
            <button onClick={close}><Icon name="X" size={11} className="text-gray-400" /></button>
          </div>
          {step === "pick" && (
            <div className="flex gap-1.5 p-3">
              {Array.from({ length: max + 1 }, (_, i) => i).map(n => (
                <button key={n} onClick={() => pick(n)}
                  className={`flex-1 h-8 rounded border text-sm font-mono
                    ${n === num ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" : "border-gray-200 text-gray-600 hover:border-blue-400"}`}>
                  {n}
                </button>
              ))}
            </div>
          )}
          {step === "reason" && (
            <div className="p-3 space-y-2">
              <div className="text-[11px] text-gray-500">Причина выдачи ×{pending}</div>
              <textarea ref={textRef} value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={120}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirm(); } if (e.key === "Escape") close(); }}
                placeholder="Причина..."
                className="w-full px-2 py-1.5 text-[12px] font-mono border border-gray-300 rounded resize-none outline-none focus:border-blue-400" />
              <div className="flex gap-2">
                <button onClick={confirm} disabled={!reason.trim()}
                  className="flex-1 py-1.5 text-[11px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
                  Применить
                </button>
                <button onClick={() => setStep("pick")} className="px-3 py-1.5 text-[11px] text-gray-500">←</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Color Picker ───────────────────────────────────────────────
export function ColorPicker({ colors, value, onChange, children }: {
  colors: string[]; value: string; onChange: (c: string) => void; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-0.5 px-1.5 py-1 hover:bg-gray-100 rounded text-gray-600">
        {children}<Icon name="ChevronDown" size={9} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 bg-white border border-gray-200 rounded shadow-lg p-2 grid grid-cols-8 gap-1"
          style={{ width: 180 }}>
          {colors.map(c => (
            <button key={c} onClick={() => { onChange(c); setOpen(false); }}
              className={`w-5 h-5 rounded border-2 ${value === c ? "border-blue-500" : "border-transparent hover:border-gray-400"}`}
              style={{
                background: c === "transparent" ? "white" : c,
                backgroundImage: c === "transparent" ? "repeating-linear-gradient(45deg,#ddd 0,#ddd 2px,white 0,white 50%)" : "none",
                backgroundSize: "4px 4px",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toolbar Button ─────────────────────────────────────────────
export function TBtn({ active, onClick, title, children }: {
  active?: boolean; onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`px-1.5 py-1 rounded text-[12px] leading-none transition-colors select-none
        ${active ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}>
      {children}
    </button>
  );
}
