import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { TableSheet, TableColumn, TableRow, TABLE_COL_COLORS, COL_ID_VERBAL, COL_ID_REPRIMAND } from "@/lib/types";

const AUTO_COLS = new Set([COL_ID_VERBAL, COL_ID_REPRIMAND]);
const COL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const getColLetter = (i: number) => {
  if (i < 26) return COL_LETTERS[i];
  return COL_LETTERS[Math.floor(i / 26) - 1] + COL_LETTERS[i % 26];
};

// ─── PENALTY CELL ────────────────────────────────────────────
function PenaltyCell({ value, colId, canEdit, onSave }: {
  value: string; colId: number; canEdit: boolean;
  onSave: (v: string, reason: string) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [step, setStep]       = useState<"pick" | "reason">("pick");
  const [pending, setPending] = useState<number | null>(null);
  const [reason, setReason]   = useState("");
  const ref     = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const isVerbal = colId === COL_ID_VERBAL;
  const max      = isVerbal ? 2 : 3;
  const options  = Array.from({ length: max + 1 }, (_, i) => i);
  const num      = parseInt(value) || 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (step === "reason") setTimeout(() => textRef.current?.focus(), 50);
  }, [step]);

  const close = () => { setOpen(false); setStep("pick"); setPending(null); setReason(""); };

  const pickNumber = (n: number) => {
    if (n === num) { close(); return; }
    if (n === 0) { onSave("0", "Снято"); close(); return; }
    setPending(n); setStep("reason");
  };

  const confirm = () => {
    if (!reason.trim()) return;
    onSave(String(pending!), reason.trim());
    close();
  };

  const colorCls = num === 0 ? "text-gray-400"
    : isVerbal
      ? num >= 2 ? "text-red-600 font-semibold" : "text-amber-600 font-semibold"
      : num >= 3 ? "text-red-600 font-semibold" : num >= 2 ? "text-orange-600 font-semibold" : "text-amber-600 font-semibold";

  return (
    <div ref={ref} className="relative w-full h-full flex items-center justify-center">
      <div
        className={`text-[12px] font-mono ${colorCls} ${canEdit ? "cursor-pointer hover:opacity-80" : ""} select-none`}
        onClick={() => { if (canEdit) { setOpen(o => !o); setStep("pick"); } }}
        title={canEdit ? "Нажмите для изменения" : undefined}
      >
        {num === 0 ? "0" : num}
      </div>

      {open && canEdit && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 rounded shadow-xl w-56">
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-[11px] font-semibold text-gray-600">
              {isVerbal ? "Уст. предупреждения" : "Выговоры"} (0–{max})
            </div>
            <button onClick={close} className="text-gray-400 hover:text-gray-600">
              <Icon name="X" size={12} />
            </button>
          </div>
          {step === "pick" && (
            <div className="flex gap-1.5 p-3">
              {options.map(n => (
                <button key={n} onClick={() => pickNumber(n)}
                  className={`flex-1 h-9 rounded border text-sm font-mono transition-all
                    ${n === num ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                      : "border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50"}`}>
                  {n}
                </button>
              ))}
            </div>
          )}
          {step === "reason" && (
            <div className="p-3 space-y-2">
              <div className="text-[11px] text-gray-500">
                Причина выдачи ×{pending}
              </div>
              <textarea ref={textRef} value={reason} onChange={e => setReason(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirm(); } if (e.key === "Escape") close(); }}
                placeholder="Причина..." rows={2} maxLength={120}
                className="w-full px-2.5 py-1.5 text-[12px] font-mono text-gray-800 bg-white border border-gray-300 rounded resize-none outline-none focus:border-blue-400 placeholder:text-gray-400"
              />
              <div className="flex gap-2">
                <button onClick={confirm} disabled={!reason.trim()}
                  className="flex-1 py-1.5 text-[11px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-all disabled:opacity-40">
                  Применить
                </button>
                <button onClick={() => setStep("pick")} className="px-3 py-1.5 text-[11px] text-gray-500 hover:text-gray-700">
                  ←
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SHEET CELL ───────────────────────────────────────────────
function SheetCell({ value, onSave, readOnly, selected, onSelect, colIdx, rowIdx }: {
  value: string; onSave: (v: string) => void; readOnly?: boolean;
  selected?: boolean; onSelect?: () => void; colIdx: number; rowIdx: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);

  const commit = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (readOnly) return (
    <div
      className={`w-full h-full px-2 py-1 text-[12px] font-mono text-gray-700 overflow-hidden whitespace-nowrap text-ellipsis
        ${selected ? "outline outline-2 outline-blue-500 bg-blue-50/50" : "hover:bg-gray-50"}`}
      onClick={onSelect}
      title={value}
    >
      {value}
    </div>
  );

  return editing ? (
    <textarea ref={ref} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
      rows={2}
      className="w-full h-full px-2 py-1 text-[12px] font-mono text-gray-800 bg-white outline outline-2 outline-blue-500 resize-none z-10 absolute inset-0"
      style={{ minHeight: 32 }}
    />
  ) : (
    <div
      className={`w-full h-full px-2 py-1 text-[12px] font-mono text-gray-800 overflow-hidden whitespace-nowrap text-ellipsis cursor-cell
        ${selected ? "outline outline-2 outline-blue-500 bg-blue-50/30" : "hover:bg-gray-50"}`}
      onClick={onSelect}
      onDoubleClick={() => !readOnly && setEditing(true)}
      title={value}
    >
      {value}
    </div>
  );
}

// ─── RESIZABLE COL HEADER ────────────────────────────────────
function ColHeaderCell({ col, letter, canEdit, selected, onSelect, onRename, onColorChange, onDelete, width, onResize }: {
  col: TableColumn; letter: string; canEdit: boolean; selected?: boolean;
  onSelect?: () => void;
  onRename: (id: number, name: string) => void;
  onColorChange: (id: number, color: string) => void;
  onDelete: (id: number) => void;
  width: number;
  onResize: (id: number, w: number) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(col.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizing = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(0);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== col.name) onRename(col.id, t);
    else setDraft(col.name);
    setEditing(false);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = width;
    const onMove = (me: MouseEvent) => {
      if (!resizing.current) return;
      const diff = me.clientX - startX.current;
      onResize(col.id, Math.max(60, startW.current + diff));
    };
    const onUp = () => { resizing.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const colorEntry = TABLE_COL_COLORS.find(c => c.value === col.color);

  return (
    <th
      className={`relative select-none border-r border-b border-gray-300 text-center group
        ${selected ? "bg-blue-100" : "bg-[#f8f9fa] hover:bg-[#f1f3f4]"}`}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="flex items-center justify-center gap-1 px-1 py-1.5 h-7 cursor-pointer" onClick={onSelect}>
        {editing ? (
          <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(col.name); setEditing(false); } }}
            className="text-[11px] font-mono bg-transparent outline-none border-b border-blue-500 w-full text-center text-gray-700"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="text-[11px] font-semibold text-gray-600 truncate select-none leading-none"
            onDoubleClick={() => canEdit && setEditing(true)}>
            {col.name}
          </span>
        )}
        {canEdit && !editing && (
          <button
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
            onClick={e => { e.stopPropagation(); setShowMenu(s => !s); }}
          >
            <Icon name="ChevronDown" size={11} />
          </button>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
        onMouseDown={onMouseDown}
      />

      {showMenu && canEdit && (
        <div ref={menuRef} className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded shadow-xl overflow-hidden min-w-[160px] text-left">
          <button onClick={() => { setEditing(true); setShowMenu(false); }}
            className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Icon name="Pencil" size={12} /> Переименовать
          </button>
          <div className="px-3 py-2 border-t border-gray-100">
            <div className="text-[10px] text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">Цвет текста</div>
            <div className="flex flex-wrap gap-1">
              {TABLE_COL_COLORS.map(c => (
                <button key={c.value} onClick={() => { onColorChange(col.id, c.value); setShowMenu(false); }}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg.replace("/30", "")}
                    ${col.color === c.value ? "border-gray-800 scale-110" : "border-transparent hover:border-gray-400"}`}
                  title={c.label} />
              ))}
            </div>
          </div>
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

// ─── HUD TABLE ────────────────────────────────────────────────
interface HudTableProps {
  sheet: TableSheet;
  canEditCells: boolean;
  canEditStructure: boolean;
  onChange: (sheet: TableSheet) => void;
  onPenaltyChange?: (nickname: string, type: "verbal" | "reprimand", count: number, reason: string) => void;
}

export default function HudTable({ sheet, canEditCells, canEditStructure, onChange, onPenaltyChange }: HudTableProps) {
  const [newColName, setNewColName]   = useState("");
  const [newColColor, setNewColColor] = useState("text-gray-700");
  const [showAddCol, setShowAddCol]   = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [selectedCol, setSelectedCol]   = useState<number | null>(null);
  const [colWidths, setColWidths]       = useState<Record<number, number>>({});

  const getWidth = (col: TableColumn) => colWidths[col.id] ?? col.width;

  const update = (s: TableSheet) => onChange(s);

  const setCell = (rowId: number, colId: number, value: string) => {
    update({ ...sheet, rows: sheet.rows.map(r => r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r) });
  };

  const addRow = () => {
    const newRow: TableRow = { id: Date.now(), cells: Object.fromEntries(sheet.columns.map(c => [c.id, ""])) };
    update({ ...sheet, rows: [...sheet.rows, newRow] });
  };

  const deleteRow = (rowId: number) => {
    update({ ...sheet, rows: sheet.rows.filter(r => r.id !== rowId) });
  };

  const addColumn = () => {
    const trimmed = newColName.trim();
    if (!trimmed) return;
    const newCol: TableColumn = { id: Date.now(), name: trimmed, color: newColColor, width: 140 };
    const newRows = sheet.rows.map(r => ({ ...r, cells: { ...r.cells, [newCol.id]: "" } }));
    update({ ...sheet, columns: [...sheet.columns, newCol], rows: newRows });
    setNewColName(""); setShowAddCol(false);
  };

  const renameCol   = (id: number, name: string) => update({ ...sheet, columns: sheet.columns.map(c => c.id === id ? { ...c, name } : c) });
  const colorCol    = (id: number, color: string) => update({ ...sheet, columns: sheet.columns.map(c => c.id === id ? { ...c, color } : c) });
  const deleteCol   = (id: number) => update({ ...sheet, columns: sheet.columns.filter(c => c.id !== id), rows: sheet.rows.map(r => { const cells = { ...r.cells }; delete cells[id]; return { ...r, cells }; }) });
  const resizeCol   = (id: number, w: number) => setColWidths(prev => ({ ...prev, [id]: w }));

  // Formula bar value
  const selRow = selectedCell ? sheet.rows[selectedCell.r] : null;
  const selCol = selectedCell ? sheet.columns[selectedCell.c] : null;
  const selValue = (selRow && selCol) ? (selRow.cells[selCol.id] ?? "") : "";
  const selAddress = selectedCell ? `${getColLetter(selectedCell.c)}${selectedCell.r + 1}` : "";

  return (
    <div className="flex flex-col bg-white border border-gray-300 rounded overflow-hidden shadow-sm" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-[#f8f9fa] flex-wrap">
        <span className="text-[12px] font-semibold text-gray-600">{sheet.name}</span>
        <span className="text-[11px] text-gray-400">·</span>
        <span className="text-[11px] text-gray-400">{sheet.rows.length} строк</span>
        <div className="ml-auto flex items-center gap-1.5">
          {canEditStructure && (
            <button onClick={() => setShowAddCol(!showAddCol)}
              className="flex items-center gap-1 text-[11px] text-gray-600 hover:bg-gray-200 px-2 py-1 rounded border border-gray-300 bg-white transition-colors">
              <Icon name="Plus" size={11} /> Столбец
            </button>
          )}
          {canEditCells && (
            <button onClick={addRow}
              className="flex items-center gap-1 text-[11px] text-gray-600 hover:bg-gray-200 px-2 py-1 rounded border border-gray-300 bg-white transition-colors">
              <Icon name="Plus" size={11} /> Строка
            </button>
          )}
        </div>
      </div>

      {/* Add column form */}
      {showAddCol && canEditStructure && (
        <div className="px-3 py-2 border-b border-gray-200 bg-[#f1f3f4] flex items-center gap-2 flex-wrap">
          <input value={newColName} onChange={e => setNewColName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addColumn()}
            placeholder="Название столбца..." maxLength={30}
            className="border border-gray-300 text-gray-800 text-[12px] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-blue-400 bg-white w-44"
          />
          <div className="flex gap-1">
            {TABLE_COL_COLORS.map(c => (
              <button key={c.value} onClick={() => setNewColColor(c.value)}
                className={`w-5 h-5 rounded-full border-2 ${c.bg.replace("/30","")} ${newColColor === c.value ? "border-gray-700 scale-110" : "border-transparent"}`}
                title={c.label} />
            ))}
          </div>
          <button onClick={addColumn}
            className="text-[11px] font-semibold bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">
            Добавить
          </button>
          <button onClick={() => setShowAddCol(false)} className="text-[11px] text-gray-500 hover:text-gray-700">Отмена</button>
        </div>
      )}

      {/* Formula bar */}
      <div className="flex items-center border-b border-gray-200 bg-white px-2 py-0.5 gap-2 min-h-[28px]">
        <div className="w-12 text-center text-[11px] font-mono font-semibold text-gray-500 border-r border-gray-200 pr-2 flex-shrink-0">
          {selAddress}
        </div>
        <div className="text-[12px] font-mono text-gray-700 flex-1 truncate px-1">{selValue}</div>
      </div>

      {/* Sheet */}
      <div className="overflow-auto" style={{ maxHeight: 480 }}>
        <table className="border-collapse w-max" style={{ tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-20">
            <tr>
              {/* Row number header corner */}
              <th className="bg-[#f8f9fa] border-r border-b border-gray-300 sticky left-0 z-30" style={{ width: 40, minWidth: 40 }}>
                <div className="h-7" />
              </th>
              {sheet.columns.map((col, ci) => (
                <ColHeaderCell
                  key={col.id}
                  col={col}
                  letter={getColLetter(ci)}
                  canEdit={canEditStructure && !AUTO_COLS.has(col.id)}
                  selected={selectedCol === ci}
                  onSelect={() => setSelectedCol(selectedCol === ci ? null : ci)}
                  onRename={renameCol}
                  onColorChange={colorCol}
                  onDelete={deleteCol}
                  width={getWidth(col)}
                  onResize={resizeCol}
                />
              ))}
              {/* Actions column */}
              {canEditCells && <th className="bg-[#f8f9fa] border-b border-gray-300" style={{ width: 32, minWidth: 32 }} />}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.length === 0 && (
              <tr>
                <td colSpan={sheet.columns.length + 2} className="px-4 py-10 text-center text-[12px] text-gray-400 font-mono">
                  {canEditCells ? 'Нажмите "+ Строка" чтобы добавить запись' : "Записей нет"}
                </td>
              </tr>
            )}
            {sheet.rows.map((row, ri) => (
              <tr key={row.id}
                className={`group ${ri % 2 === 0 ? "bg-white" : "bg-[#fafafa]"} hover:bg-blue-50/40 transition-colors`}
                style={{ height: 28 }}
              >
                {/* Row number */}
                <td className="sticky left-0 z-10 border-r border-b border-gray-200 text-center bg-[#f8f9fa] group-hover:bg-[#e8eaed] transition-colors cursor-pointer select-none"
                  style={{ width: 40, minWidth: 40 }}
                >
                  <span className="text-[11px] font-mono text-gray-500">{ri + 1}</span>
                </td>

                {sheet.columns.map((col, ci) => {
                  const isSel = selectedCell?.r === ri && selectedCell?.c === ci;
                  const isPenalty = AUTO_COLS.has(col.id);
                  const nick = row.cells[sheet.columns[0]?.id] ?? "";

                  return (
                    <td key={col.id}
                      className={`relative border-r border-b border-gray-200 p-0 align-middle overflow-hidden
                        ${isSel ? "outline outline-2 outline-blue-500 z-10" : ""}`}
                      style={{ width: getWidth(col), minWidth: getWidth(col), maxWidth: getWidth(col), height: 28 }}
                      onClick={() => setSelectedCell({ r: ri, c: ci })}
                    >
                      {isPenalty ? (
                        <PenaltyCell
                          value={row.cells[col.id] ?? "0"}
                          colId={col.id}
                          canEdit={canEditCells}
                          onSave={(v, reason) => {
                            setCell(row.id, col.id, v);
                            if (onPenaltyChange) {
                              onPenaltyChange(nick, col.id === COL_ID_VERBAL ? "verbal" : "reprimand", parseInt(v), reason);
                            }
                          }}
                        />
                      ) : (
                        <SheetCell
                          value={row.cells[col.id] ?? ""}
                          onSave={v => setCell(row.id, col.id, v)}
                          readOnly={!canEditCells}
                          selected={isSel}
                          onSelect={() => setSelectedCell({ r: ri, c: ci })}
                          colIdx={ci}
                          rowIdx={ri}
                        />
                      )}
                    </td>
                  );
                })}

                {canEditCells && (
                  <td className="border-b border-gray-200 p-0 text-center" style={{ width: 32 }}>
                    <button onClick={() => deleteRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1">
                      <Icon name="X" size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tab bar */}
      <div className="flex items-center border-t border-gray-200 bg-[#f8f9fa] px-2 py-1 gap-1">
        <div className="flex items-center gap-0.5 border border-gray-300 rounded bg-white px-2 py-0.5">
          <Icon name="Table2" size={10} className="text-blue-500" />
          <span className="text-[11px] text-gray-700 font-medium ml-1">Лист1</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <Icon name="Plus" size={12} />
        </button>
      </div>
    </div>
  );
}
