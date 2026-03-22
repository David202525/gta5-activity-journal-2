import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import HudSelect from "@/components/ui/hud-select";
import { TableSheet, TableColumn, TableRow, TABLE_COL_COLORS, COL_ID_VERBAL, COL_ID_REPRIMAND } from "@/lib/types";

const AUTO_COLS = new Set([COL_ID_VERBAL, COL_ID_REPRIMAND]);

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
    setPending(n);
    setStep("reason");
  };

  const confirm = () => {
    if (!reason.trim()) return;
    onSave(String(pending!), reason.trim());
    close();
  };

  const colorCls = num === 0
    ? "text-purple-700"
    : isVerbal
      ? num >= 2 ? "text-red-400" : "text-yellow-300"
      : num >= 3 ? "text-red-400" : num >= 2 ? "text-orange-300" : "text-yellow-300";

  return (
    <div ref={ref} className="relative px-2 py-1.5">
      <div
        className={`text-[11px] font-mono-hud ${colorCls} ${canEdit ? "cursor-pointer hover:opacity-80" : ""} select-none`}
        onClick={() => { if (canEdit) { setOpen(o => !o); setStep("pick"); } }}
        title={canEdit ? "Нажмите для изменения" : undefined}
      >
        {num === 0 ? "—" : num}
      </div>

      {open && canEdit && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#110d1e] border border-purple-700/50 rounded-xl shadow-xl w-56">
          <div className="px-3 py-2 border-b border-purple-900/40 flex items-center justify-between">
            <div className="text-[10px] font-hud tracking-widest text-purple-600">
              {isVerbal ? "УСТ. ПРЕДУПРЕЖДЕНИЯ" : "ВЫГОВОРЫ"} (0–{max})
            </div>
            <button onClick={close} className="text-purple-800 hover:text-purple-400 transition-colors">
              <Icon name="X" size={11} />
            </button>
          </div>

          {step === "pick" && (
            <div className="flex gap-1.5 p-3">
              {options.map(n => (
                <button key={n} onClick={() => pickNumber(n)}
                  className={`w-9 h-9 rounded-lg font-hud text-sm border transition-all flex-1
                    ${n === num
                      ? "border-violet-500/70 bg-violet-700/30 text-violet-200"
                      : "border-purple-800/40 text-purple-500 hover:border-violet-600/50 hover:text-violet-300"
                    }`}>
                  {n}
                </button>
              ))}
            </div>
          )}

          {step === "reason" && (
            <div className="p-3 space-y-2.5">
              <div className="text-[10px] font-hud text-purple-500">
                Укажите причину выдачи <span className={isVerbal ? "text-yellow-400" : "text-orange-400"}>×{pending}</span>
              </div>
              <textarea
                ref={textRef}
                value={reason}
                onChange={e => setReason(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirm(); } if (e.key === "Escape") close(); }}
                placeholder="Причина..."
                rows={2}
                maxLength={120}
                className="w-full px-2.5 py-2 text-[11px] font-mono-hud text-purple-100 bg-purple-900/40 border border-purple-700/50 rounded-lg resize-none outline-none focus:border-violet-500/60 placeholder:text-purple-800 leading-snug"
              />
              <div className="flex gap-2">
                <button onClick={confirm} disabled={!reason.trim()}
                  className="flex-1 btn-hud text-[10px] font-hud tracking-wider py-1.5 rounded-lg border border-violet-600/50 bg-violet-700/30 text-violet-200 hover:bg-violet-700/50 transition-all disabled:opacity-40">
                  ПРИМЕНИТЬ
                </button>
                <button onClick={() => setStep("pick")}
                  className="px-3 py-1.5 text-[10px] font-hud text-purple-700 hover:text-purple-400 transition-colors">
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

// ─── INLINE CELL ─────────────────────────────────────────────
function Cell({ value, onSave, readOnly }: {
  value: string; onSave: (v: string) => void; readOnly?: boolean;
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
    <div className="px-2 py-1.5 text-[11px] font-mono-hud text-purple-500 truncate" title={value}>{value || "—"}</div>
  );

  return editing ? (
    <textarea
      ref={ref}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      rows={2}
      className="w-full px-2 py-1.5 text-[11px] font-mono-hud text-purple-100 bg-violet-900/30 border border-violet-600/50 rounded-md resize-none outline-none leading-tight"
    />
  ) : (
    <div
      className="px-2 py-1.5 text-[11px] font-mono-hud text-purple-200 cursor-text hover:bg-purple-900/20 rounded-md transition-colors min-h-[28px] leading-tight truncate"
      title={value}
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-purple-800">—</span>}
    </div>
  );
}

// ─── COLUMN HEADER ───────────────────────────────────────────
function ColHeader({ col, canEdit, onRename, onColorChange, onDelete }: {
  col: TableColumn; canEdit: boolean;
  onRename: (id: number, name: string) => void;
  onColorChange: (id: number, color: string) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [draft, setDraft] = useState(col.name);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== col.name) onRename(col.id, t);
    else setDraft(col.name);
    setEditing(false);
  };

  const bg = TABLE_COL_COLORS.find(c => c.value === col.color)?.bg ?? "bg-purple-900/30";

  return (
    <div className={`relative flex items-center gap-1.5 px-3 py-2 ${bg} border-b border-r border-purple-800/30 w-full overflow-hidden`}>
      {editing ? (
        <input ref={ref} value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(col.name); setEditing(false); } }}
          className={`font-hud text-[10px] tracking-wider bg-transparent outline-none border-b border-violet-400/50 flex-1 ${col.color}`}
        />
      ) : (
        <span className={`font-hud text-[10px] tracking-wider flex-1 uppercase ${col.color} ${canEdit ? "cursor-text" : ""}`}
          onClick={() => canEdit && setEditing(true)}>
          {col.name}
        </span>
      )}

      {canEdit && !editing && (
        <button onClick={() => setShowMenu(!showMenu)}
          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-purple-700 hover:text-purple-400 transition-all">
          <Icon name="MoreVertical" size={11} />
        </button>
      )}

      {showMenu && canEdit && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#110d1e] border border-purple-700/50 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
          <div className="px-3 py-2 border-b border-purple-900/40">
            <div className="text-[10px] font-hud tracking-widest text-purple-600 mb-2">ЦВЕТ</div>
            <div className="flex flex-wrap gap-1">
              {TABLE_COL_COLORS.map(c => (
                <button key={c.value} onClick={() => { onColorChange(col.id, c.value); setShowMenu(false); }}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg.replace("/30", "")} ${col.color === c.value ? "border-white scale-110" : "border-transparent"}`}
                  title={c.label} />
              ))}
            </div>
          </div>
          <button onClick={() => { setEditing(true); setShowMenu(false); }}
            className="w-full text-left px-3 py-2 text-[11px] font-mono-hud text-purple-300 hover:bg-purple-900/30 transition-all flex items-center gap-2">
            <Icon name="Pencil" size={11} /> Переименовать
          </button>
          <button onClick={() => { onDelete(col.id); setShowMenu(false); }}
            className="w-full text-left px-3 py-2 text-[11px] font-mono-hud text-red-400 hover:bg-red-900/20 transition-all flex items-center gap-2">
            <Icon name="Trash2" size={11} /> Удалить столбец
          </button>
        </div>
      )}
    </div>
  );
}

// ─── HUD TABLE ────────────────────────────────────────────────
interface HudTableProps {
  sheet: TableSheet;
  canEditCells: boolean;    // лидер/куратор — редактирует ячейки
  canEditStructure: boolean;// куратор орг/адм — добавляет столбцы, меняет цвет
  onChange: (sheet: TableSheet) => void;
  onPenaltyChange?: (nickname: string, type: "verbal" | "reprimand", count: number, reason: string) => void;
}

export default function HudTable({ sheet, canEditCells, canEditStructure, onChange, onPenaltyChange }: HudTableProps) {
  const [newColName, setNewColName] = useState("");
  const [newColColor, setNewColColor] = useState("text-purple-300");
  const [showAddCol, setShowAddCol] = useState(false);

  const update = (s: TableSheet) => onChange(s);

  // Ячейка
  const setCell = (rowId: number, colId: number, value: string) => {
    update({
      ...sheet,
      rows: sheet.rows.map(r => r.id === rowId
        ? { ...r, cells: { ...r.cells, [colId]: value } }
        : r
      ),
    });
  };

  // Добавить строку
  const addRow = () => {
    const newRow: TableRow = {
      id: Date.now(),
      cells: Object.fromEntries(sheet.columns.map(c => [c.id, ""])),
    };
    update({ ...sheet, rows: [...sheet.rows, newRow] });
  };

  // Удалить строку
  const deleteRow = (rowId: number) => {
    update({ ...sheet, rows: sheet.rows.filter(r => r.id !== rowId) });
  };

  // Добавить столбец
  const addColumn = () => {
    const trimmed = newColName.trim();
    if (!trimmed) return;
    const newCol: TableColumn = { id: Date.now(), name: trimmed, color: newColColor, width: 140 };
    const newRows = sheet.rows.map(r => ({ ...r, cells: { ...r.cells, [newCol.id]: "" } }));
    update({ ...sheet, columns: [...sheet.columns, newCol], rows: newRows });
    setNewColName(""); setShowAddCol(false);
  };

  // Переименовать столбец
  const renameCol = (id: number, name: string) => {
    update({ ...sheet, columns: sheet.columns.map(c => c.id === id ? { ...c, name } : c) });
  };

  // Цвет столбца
  const colorCol = (id: number, color: string) => {
    update({ ...sheet, columns: sheet.columns.map(c => c.id === id ? { ...c, color } : c) });
  };

  // Удалить столбец
  const deleteCol = (id: number) => {
    update({
      ...sheet,
      columns: sheet.columns.filter(c => c.id !== id),
      rows: sheet.rows.map(r => {
        const cells = { ...r.cells };
        delete cells[id];
        return { ...r, cells };
      }),
    });
  };

  return (
    <div className="hud-panel overflow-hidden animate-fade-in">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-purple-900/40 flex items-center gap-3">
        <Icon name="Table2" size={13} className="text-violet-400" />
        <span className="font-hud text-xs tracking-widest text-purple-400/80">{sheet.name.toUpperCase()}</span>
        <span className="font-mono-hud text-[10px] text-purple-800">{sheet.rows.length} строк · {sheet.columns.length} столбцов</span>
        <div className="ml-auto flex items-center gap-2">
          {canEditStructure && (
            <button onClick={() => setShowAddCol(!showAddCol)}
              className="btn-hud flex items-center gap-1.5 text-[10px] font-hud tracking-wider px-3 py-1.5 bg-purple-900/30 border border-purple-800/40 text-purple-400 rounded-lg hover:bg-purple-800/30 transition-all">
              <Icon name="Plus" size={11} /> Столбец
            </button>
          )}
          {canEditCells && (
            <button onClick={addRow}
              className="btn-hud flex items-center gap-1.5 text-[10px] font-hud tracking-wider px-3 py-1.5 bg-violet-900/30 border border-violet-700/40 text-violet-400 rounded-lg hover:bg-violet-800/30 transition-all">
              <Icon name="Plus" size={11} /> Строка
            </button>
          )}
        </div>
      </div>

      {/* Add column form */}
      {showAddCol && canEditStructure && (
        <div className="px-5 py-3 border-b border-purple-900/30 bg-purple-950/40 flex items-center gap-2 flex-wrap">
          <input value={newColName} onChange={e => setNewColName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addColumn()}
            placeholder="Название столбца..." maxLength={24}
            className="border border-purple-800/40 text-purple-100 text-sm px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none placeholder:text-purple-900/50 bg-transparent focus:border-violet-600/50 transition-all w-48"
          />
          <div className="w-32">
            <HudSelect value={newColColor} onChange={setNewColColor}
              options={TABLE_COL_COLORS.map(c => ({ value: c.value, label: c.label, color: c.value }))} />
          </div>
          <button onClick={addColumn}
            className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-violet-700/40 border border-violet-600/40 text-violet-200 rounded-lg hover:bg-violet-700/60 transition-all">
            ДОБАВИТЬ
          </button>
          <button onClick={() => setShowAddCol(false)}
            className="text-[10px] text-purple-700 hover:text-purple-400 transition-all">отмена</button>
        </div>
      )}

      {/* Table */}
      <div className="w-full">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col style={{ width: "32px" }} />
            {sheet.columns.map(col => (
              <col key={col.id} />
            ))}
            {canEditCells && <col style={{ width: "32px" }} />}
          </colgroup>
          <thead>
            <tr className="group">
              <th className="px-2 py-2 bg-purple-900/20 border-b border-r border-purple-800/30 text-[10px] font-mono-hud text-purple-800">#</th>
              {sheet.columns.map(col => (
                <th key={col.id} className="group">
                  <ColHeader col={col} canEdit={canEditStructure}
                    onRename={renameCol} onColorChange={colorCol} onDelete={deleteCol} />
                </th>
              ))}
              {canEditCells && <th className="bg-purple-900/20 border-b border-purple-800/30" />}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.length === 0 && (
              <tr>
                <td colSpan={sheet.columns.length + 2}
                  className="px-4 py-8 text-center font-mono-hud text-xs text-purple-800">
                  {canEditCells ? "Нажмите «+ Строка» чтобы добавить запись" : "Записей нет"}
                </td>
              </tr>
            )}
            {sheet.rows.map((row, ri) => (
              <tr key={row.id} className="group hover:bg-purple-900/10 transition-colors border-b border-purple-900/20">
                <td className="text-center text-[10px] font-mono-hud text-purple-800 px-2 py-1.5 border-r border-purple-800/20">
                  {ri + 1}
                </td>
                {sheet.columns.map(col => (
                  <td key={col.id} className="border-r border-purple-800/10 align-middle overflow-hidden">
                    {AUTO_COLS.has(col.id) ? (
                      <PenaltyCell
                        value={row.cells[col.id] ?? "0"}
                        colId={col.id}
                        canEdit={canEditCells && !!onPenaltyChange}
                        onSave={(v, reason) => {
                          const nickname = row.cells[1] ?? "";
                          const type = col.id === COL_ID_VERBAL ? "verbal" : "reprimand";
                          onPenaltyChange?.(nickname, type, parseInt(v) || 0, reason);
                        }}
                      />
                    ) : (
                      <Cell value={row.cells[col.id] ?? ""} readOnly={!canEditCells}
                        onSave={v => setCell(row.id, col.id, v)} />
                    )}
                  </td>
                ))}
                {canEditCells && (
                  <td className="px-2 align-middle">
                    <button onClick={() => deleteRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 text-purple-800 hover:text-red-400 transition-all">
                      <Icon name="X" size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}