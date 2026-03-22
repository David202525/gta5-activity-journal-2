import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // доп. цвет метки
}

interface HudSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export default function HudSelect({ value, onChange, options, placeholder = "Выбрать...", className = "" }: HudSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 border border-purple-800/40 text-purple-100 text-sm px-4 py-2.5 rounded-xl font-mono-hud focus:outline-none bg-transparent hover:border-violet-600/50 focus:border-violet-600/50 transition-all"
      >
        <span className={selected?.color ?? "text-purple-100"}>
          {selected ? selected.label : <span className="text-purple-700">{placeholder}</span>}
        </span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={13} className="text-purple-600 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#110d1e] border border-purple-700/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-y-auto max-h-64">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-mono-hud transition-all flex items-center gap-2 ${
                opt.value === value
                  ? "bg-violet-700/30 text-violet-200"
                  : "text-purple-300 hover:bg-purple-900/40 hover:text-purple-100"
              }`}
            >
              {opt.value === value && <Icon name="Check" size={11} className="text-violet-400 flex-shrink-0" />}
              {opt.value !== value && <span className="w-[11px]" />}
              <span className={opt.color}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}