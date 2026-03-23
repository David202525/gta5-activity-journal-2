import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { TableColumn } from "@/lib/types";
import { AUTO_COLS, colLetter, HEADER_H } from "./TableTypes";

interface ColHeadProps {
  col: TableColumn;
  ci: number;
  width: number;
  canEdit: boolean;
  frozen: boolean;
  selected?: boolean;
  onSelect: () => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onResizeStart: (id: number, e: React.MouseEvent) => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
}

export function ColHead({
  col, ci, width, canEdit, frozen, selected,
  onSelect, onRename, onDelete, onResizeStart, onSortAsc, onSortDesc,
}: ColHeadProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(col.name);
  const menuRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== col.name) onRename(col.id, t); else setDraft(col.name);
    setEditing(false);
  };

  return (
    <th
      className={`relative select-none border-r border-b border-gray-300 group p-0
        ${frozen ? "bg-[#e8f4e8]" : selected ? "bg-[#d2e3fc]" : "bg-[#f8f9fa] hover:bg-[#f1f3f4]"}`}
      style={{ width, minWidth: width, maxWidth: width, height: HEADER_H }}
    >
      <div className="flex items-center justify-center h-full px-1 cursor-pointer gap-0.5" onClick={onSelect}>
        {editing ? (
          <input ref={inputRef} value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(col.name); setEditing(false); }
            }}
            className="text-[11px] font-mono bg-transparent outline-none border-b border-blue-500 w-full text-center text-gray-700"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-[11px] font-semibold text-gray-600 truncate leading-none"
            style={{ maxWidth: width - 20 }}
            onDoubleClick={() => canEdit && setEditing(true)}
          >
            {colLetter(ci)} · {col.name}
          </span>
        )}
        {canEdit && !editing && (
          <button
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
            onClick={e => { e.stopPropagation(); setShowMenu(s => !s); }}
          >
            <Icon name="ChevronDown" size={10} />
          </button>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 hover:bg-blue-400"
        onMouseDown={e => onResizeStart(col.id, e)}
      />

      {showMenu && canEdit && (
        <div ref={menuRef}
          className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded shadow-xl overflow-hidden min-w-[170px] text-left">
          <button onClick={() => { onSortAsc(); setShowMenu(false); }}
            className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Icon name="ArrowUpAZ" size={12} /> Сортировка А→Я
          </button>
          <button onClick={() => { onSortDesc(); setShowMenu(false); }}
            className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Icon name="ArrowDownZA" size={12} /> Сортировка Я→А
          </button>
          <div className="border-t border-gray-100" />
          <button onClick={() => { setEditing(true); setShowMenu(false); }}
            className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Icon name="Pencil" size={12} /> Переименовать
          </button>
          {!AUTO_COLS.has(col.id) && (
            <button onClick={() => { onDelete(col.id); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100">
              <Icon name="Trash2" size={12} /> Удалить столбец
            </button>
          )}
        </div>
      )}
    </th>
  );
}
