import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Icon from "@/components/ui/icon";
import { TableSheet, TableColumn, TableRow, COL_ID_VERBAL, COL_ID_REPRIMAND } from "@/lib/types";
import {
  CellStyle, CellStyles,
  AUTO_COLS, colLetter, DEFAULT_COL_W, ROW_H, HEADER_H,
  FONT_SIZES, TEXT_COLORS, BG_COLORS,
  buildCellStyle, evalFormula,
} from "./TableTypes";
import { PenaltyCell, ColorPicker, TBtn } from "./TableCellComponents";
import { ColHead } from "./TableColHead";

interface HudTableProps {
  sheet: TableSheet;
  canEditCells: boolean;
  canEditStructure: boolean;
  onChange: (sheet: TableSheet) => void;
  onPenaltyChange?: (nickname: string, type: "verbal" | "reprimand", count: number, reason: string) => void;
}

export default function HudTable({ sheet, canEditCells, canEditStructure, onChange, onPenaltyChange }: HudTableProps) {
  const [sel, setSel]               = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing]       = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue]   = useState("");
  const [colWidths, setColWidths]   = useState<Record<number, number>>({});
  const [styles, setStyles]         = useState<CellStyles>({});
  const [newColName, setNewColName] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [frozenRows, setFrozenRows] = useState(0);
  const [frozenCols, setFrozenCols] = useState(0);
  const [showFreezeMenu, setShowFreezeMenu] = useState(false);
  const [zoom, setZoom]             = useState(100);
  const [history, setHistory]       = useState<TableSheet[]>([sheet]);
  const [histIdx, setHistIdx]       = useState(0);

  const inputRef     = useRef<HTMLInputElement>(null);
  const freezeRef    = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  useEffect(() => {
    if (!showFreezeMenu) return;
    const h = (e: MouseEvent) => { if (!freezeRef.current?.contains(e.target as Node)) setShowFreezeMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showFreezeMenu]);

  const getW = (col: TableColumn) => colWidths[col.id] ?? col.width ?? DEFAULT_COL_W;

  // ── History ──
  const push = (s: TableSheet) => {
    const stack = history.slice(0, histIdx + 1).concat(s);
    setHistory(stack); setHistIdx(stack.length - 1); onChange(s);
  };
  const undo = () => { if (histIdx <= 0) return; setHistIdx(i => i - 1); onChange(history[histIdx - 1]); };
  const redo = () => { if (histIdx >= history.length - 1) return; setHistIdx(i => i + 1); onChange(history[histIdx + 1]); };

  // ── Style helpers ──
  const sk = (rid: number, cid: number) => `${rid}_${cid}`;
  const gs = (rid: number, cid: number): CellStyle => styles[sk(rid, cid)] ?? {};
  const ss = (rid: number, cid: number, patch: Partial<CellStyle>) =>
    setStyles(prev => ({ ...prev, [sk(rid, cid)]: { ...prev[sk(rid, cid)], ...patch } }));

  const selRow = sel ? sheet.rows[sel.r] : null;
  const selCol = sel ? sheet.columns[sel.c] : null;
  const selSt: CellStyle = (selRow && selCol) ? gs(selRow.id, selCol.id) : {};
  const selVal  = (selRow && selCol) ? (selRow.cells[selCol.id] ?? "") : "";
  const selAddr = sel ? `${colLetter(sel.c)}${sel.r + 1}` : "";

  const toggleSt = (key: keyof CellStyle, val: unknown) => {
    if (!selRow || !selCol) return;
    const cur = gs(selRow.id, selCol.id);
    ss(selRow.id, selCol.id, { [key]: cur[key] ? undefined : val });
  };
  const applySt = (key: keyof CellStyle, val: unknown) => {
    if (!selRow || !selCol) return;
    ss(selRow.id, selCol.id, { [key]: val as CellStyle[typeof key] });
  };

  // ── Sheet mutations ──
  const setCell = (rid: number, cid: number, v: string) =>
    push({ ...sheet, rows: sheet.rows.map(r => r.id === rid ? { ...r, cells: { ...r.cells, [cid]: v } } : r) });

  const addRow = () => push({
    ...sheet,
    rows: [...sheet.rows, { id: Date.now(), cells: Object.fromEntries(sheet.columns.map(c => [c.id, ""])) }],
  });

  const delRow = (id: number) => push({ ...sheet, rows: sheet.rows.filter(r => r.id !== id) });

  const addCol = () => {
    const t = newColName.trim(); if (!t) return;
    const nc: TableColumn = { id: Date.now(), name: t, color: "text-gray-700", width: DEFAULT_COL_W };
    push({ ...sheet, columns: [...sheet.columns, nc], rows: sheet.rows.map(r => ({ ...r, cells: { ...r.cells, [nc.id]: "" } })) });
    setNewColName(""); setShowAddCol(false);
  };

  const renameCol = (id: number, name: string) =>
    push({ ...sheet, columns: sheet.columns.map(c => c.id === id ? { ...c, name } : c) });

  const delCol = (id: number) => push({
    ...sheet,
    columns: sheet.columns.filter(c => c.id !== id),
    rows: sheet.rows.map(r => { const cells = { ...r.cells }; delete cells[id]; return { ...r, cells }; }),
  });

  const resizeCol = (id: number, w: number) => setColWidths(p => ({ ...p, [id]: Math.max(40, w) }));

  const sortCol = (cid: number, asc: boolean) => {
    const sorted = [...sheet.rows].sort((a, b) => {
      const av = a.cells[cid] ?? "", bv = b.cells[cid] ?? "";
      const an = parseFloat(av), bn = parseFloat(bv);
      if (!isNaN(an) && !isNaN(bn)) return asc ? an - bn : bn - an;
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    push({ ...sheet, rows: sorted });
  };

  // ── Edit ──
  const startEdit = (ri: number, ci: number) => {
    if (!canEditCells) return;
    const row = sheet.rows[ri]; const col = sheet.columns[ci];
    if (!row || !col || AUTO_COLS.has(col.id)) return;
    setEditing({ r: ri, c: ci }); setEditValue(row.cells[col.id] ?? "");
  };
  const commitEdit = () => {
    if (!editing) return;
    const row = sheet.rows[editing.r]; const col = sheet.columns[editing.c];
    if (row && col) setCell(row.id, col.id, editValue);
    setEditing(null);
  };
  const cancelEdit = () => setEditing(null);

  // ── Keyboard ──
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    if (!sel) return;
    const { r, c } = sel;
    if (e.key === "ArrowDown")  { e.preventDefault(); setSel({ r: Math.min(r + 1, sheet.rows.length - 1), c }); return; }
    if (e.key === "ArrowUp")    { e.preventDefault(); setSel({ r: Math.max(r - 1, 0), c }); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); setSel({ r, c: Math.min(c + 1, sheet.columns.length - 1) }); return; }
    if (e.key === "ArrowLeft")  { e.preventDefault(); setSel({ r, c: Math.max(c - 1, 0) }); return; }
    if (e.key === "Enter")      { e.preventDefault(); startEdit(r, c); return; }
    if (e.key === "Tab")        { e.preventDefault(); setSel({ r, c: Math.min(c + 1, sheet.columns.length - 1) }); return; }
    if (e.key === "Delete" || e.key === "Backspace") {
      const row = sheet.rows[r]; const col = sheet.columns[c];
      if (row && col && canEditCells && !AUTO_COLS.has(col.id)) setCell(row.id, col.id, "");
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z") { e.preventDefault(); undo(); }
      if (e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "b") { e.preventDefault(); toggleSt("bold", true); }
      if (e.key === "i") { e.preventDefault(); toggleSt("italic", true); }
      if (e.key === "u") { e.preventDefault(); toggleSt("underline", true); }
    }
  };

  // ── Column resize ──
  const onResizeStart = (colId: number, e: React.MouseEvent) => {
    e.preventDefault();
    const sx = e.clientX, sw = getW(sheet.columns.find(c => c.id === colId)!);
    const mv = (me: MouseEvent) => resizeCol(colId, sw + me.clientX - sx);
    const up = () => { document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
  };

  const freezeOpts = [
    { label: "Без заморозки",       fn: () => { setFrozenRows(0); setFrozenCols(0); } },
    { label: "1 строка",            fn: () => setFrozenRows(1) },
    { label: "2 строки",            fn: () => setFrozenRows(2) },
    { label: "До текущей строки",   fn: () => sel && setFrozenRows(sel.r + 1) },
    { label: "1 столбец",           fn: () => setFrozenCols(1) },
    { label: "2 столбца",           fn: () => setFrozenCols(2) },
    { label: "До текущего столбца", fn: () => sel && setFrozenCols(sel.c + 1) },
  ];

  return (
    <div className="flex flex-col bg-white border border-gray-300 rounded shadow overflow-hidden"
      style={{ fontFamily: "Arial,sans-serif", fontSize: 12 }}
      tabIndex={0} onKeyDown={onKey} ref={containerRef}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 px-2 border-b border-gray-200 bg-white flex-wrap" style={{ minHeight: 38 }}>
        <TBtn onClick={undo} title="Отменить (Ctrl+Z)"><Icon name="Undo2" size={14} /></TBtn>
        <TBtn onClick={redo} title="Повторить (Ctrl+Y)"><Icon name="Redo2" size={14} /></TBtn>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="px-1 hover:bg-gray-100 rounded text-gray-600 font-mono">−</button>
          <span className="text-[11px] text-gray-600 w-9 text-center font-mono">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="px-1 hover:bg-gray-100 rounded text-gray-600 font-mono">+</button>
        </div>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Font size */}
        <select value={selSt.fontSize ?? 12} onChange={e => applySt("fontSize", parseInt(e.target.value))}
          className="text-[11px] border border-gray-300 rounded px-1 py-0.5 w-12 focus:outline-none focus:border-blue-400 bg-white text-gray-700">
          {FONT_SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Bold / Italic / Underline / Strike */}
        <TBtn active={!!selSt.bold}      onClick={() => toggleSt("bold", true)}      title="Жирный (Ctrl+B)"><b>Ж</b></TBtn>
        <TBtn active={!!selSt.italic}    onClick={() => toggleSt("italic", true)}    title="Курсив (Ctrl+I)"><i>К</i></TBtn>
        <TBtn active={!!selSt.underline} onClick={() => toggleSt("underline", true)} title="Подчёркнутый"><u>Ч</u></TBtn>
        <TBtn active={!!selSt.strike}    onClick={() => toggleSt("strike", true)}    title="Зачёркнутый"><s>З</s></TBtn>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Text color */}
        <ColorPicker colors={TEXT_COLORS} value={selSt.color ?? "#000000"} onChange={c => applySt("color", c)}>
          <span className="text-[13px] font-bold leading-none"
            style={{ color: selSt.color ?? "#000", borderBottom: `2px solid ${selSt.color ?? "#ea4335"}` }}>А</span>
        </ColorPicker>

        {/* BG color */}
        <ColorPicker colors={BG_COLORS} value={selSt.bg ?? "transparent"} onChange={c => applySt("bg", c)}>
          <span className="relative flex items-center">
            <Icon name="Paintbrush" size={13} />
            <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded"
              style={{ background: selSt.bg && selSt.bg !== "transparent" ? selSt.bg : "#fbbc04" }} />
          </span>
        </ColorPicker>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Align */}
        <TBtn active={selSt.align === "left" || !selSt.align} onClick={() => applySt("align", "left")}   title="По левому краю"><Icon name="AlignLeft"   size={13} /></TBtn>
        <TBtn active={selSt.align === "center"}               onClick={() => applySt("align", "center")} title="По центру">     <Icon name="AlignCenter" size={13} /></TBtn>
        <TBtn active={selSt.align === "right"}                onClick={() => applySt("align", "right")}  title="По правому краю"><Icon name="AlignRight"  size={13} /></TBtn>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Freeze */}
        <div ref={freezeRef} className="relative">
          <TBtn onClick={() => setShowFreezeMenu(o => !o)} title="Закрепить">
            <span className="flex items-center gap-0.5 text-[11px]"><Icon name="Lock" size={12} />Закрепить</span>
          </TBtn>
          {showFreezeMenu && (
            <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-gray-200 rounded shadow-lg overflow-hidden min-w-[190px]">
              {freezeOpts.map((o, i) => (
                <button key={i} onClick={() => { o.fn(); setShowFreezeMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50">{o.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Add col / row */}
        {canEditStructure && (
          <TBtn onClick={() => setShowAddCol(o => !o)} title="Добавить столбец">
            <span className="flex items-center gap-0.5 text-[11px]"><Icon name="Plus" size={12} />Столбец</span>
          </TBtn>
        )}
        {canEditCells && (
          <TBtn onClick={addRow} title="Добавить строку">
            <span className="flex items-center gap-0.5 text-[11px]"><Icon name="Plus" size={12} />Строка</span>
          </TBtn>
        )}
        <span className="ml-auto text-[11px] text-gray-400 pr-1 font-medium">{sheet.name}</span>
      </div>

      {/* ── Add column form ── */}
      {showAddCol && canEditStructure && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
          <input value={newColName} onChange={e => setNewColName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCol()}
            placeholder="Название столбца..." maxLength={30} autoFocus
            className="border border-gray-300 text-gray-800 text-[12px] px-2.5 py-1 rounded font-mono focus:outline-none focus:border-blue-400 bg-white w-44" />
          <button onClick={addCol} className="text-[11px] font-semibold bg-[#1a73e8] text-white px-3 py-1 rounded hover:bg-[#1557b0]">Добавить</button>
          <button onClick={() => setShowAddCol(false)} className="text-[11px] text-gray-500 hover:text-gray-700">Отмена</button>
        </div>
      )}

      {/* ── Formula bar ── */}
      <div className="flex items-center border-b border-gray-200 bg-white" style={{ height: 26 }}>
        <div className="w-16 flex-shrink-0 border-r border-gray-200 h-full flex items-center justify-center">
          <span className="text-[11px] font-mono font-semibold text-gray-600">{selAddr}</span>
        </div>
        <div className="flex items-center flex-1 px-2 gap-1.5 h-full">
          <span className="text-gray-400 text-[12px] italic">fx</span>
          {editing && selRow && selCol ? (
            <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitEdit(); } if (e.key === "Escape") cancelEdit(); }}
              className="flex-1 text-[12px] font-mono text-gray-800 outline-none bg-transparent" />
          ) : (
            <span className="text-[12px] font-mono text-gray-700 truncate">{selVal}</span>
          )}
        </div>
      </div>

      {/* ── Sheet ── */}
      <div className="overflow-auto" style={{ maxHeight: 460 }}>
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", width: `${10000 / zoom}%` }}>
          <table className="border-collapse" style={{ tableLayout: "fixed", width: "max-content" }}>
            <thead className="sticky top-0 z-20">
              <tr style={{ height: HEADER_H }}>
                {/* Corner cell */}
                <th className="sticky left-0 z-30 bg-[#f8f9fa] border-r border-b border-gray-300 select-none"
                  style={{ width: 46, minWidth: 46 }}>
                  <div className="h-full flex items-center justify-center">
                    <Icon name="LayoutGrid" size={10} className="text-gray-400" />
                  </div>
                </th>
                {sheet.columns.map((col, ci) => (
                  <ColHead key={col.id} col={col} ci={ci} width={getW(col)}
                    canEdit={canEditStructure && !AUTO_COLS.has(col.id)}
                    frozen={ci < frozenCols} selected={sel?.c === ci}
                    onSelect={() => setSel({ r: 0, c: ci })}
                    onRename={renameCol} onDelete={delCol}
                    onResizeStart={onResizeStart}
                    onSortAsc={() => sortCol(col.id, true)}
                    onSortDesc={() => sortCol(col.id, false)}
                  />
                ))}
                <th className="bg-[#f8f9fa] border-b border-gray-300" style={{ width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {sheet.rows.length === 0 && (
                <tr>
                  <td colSpan={sheet.columns.length + 2} className="px-4 py-10 text-center text-[12px] text-gray-400">
                    {canEditCells ? 'Нажмите "+ Строка" чтобы добавить запись' : "Нет данных"}
                  </td>
                </tr>
              )}
              {sheet.rows.map((row, ri) => {
                const isFRow = ri < frozenRows;
                return (
                  <tr key={row.id} style={{ height: ROW_H }}
                    className={`group ${ri % 2 === 0 ? "bg-white" : "bg-[#fafafa]"} hover:bg-[#e8f0fe]/20`}>
                    {/* Row number */}
                    <td className={`sticky left-0 z-10 border-r border-b border-gray-200 text-center select-none
                        ${isFRow ? "bg-[#c8e6c9]" : "bg-[#f8f9fa] group-hover:bg-[#e8eaed]"}`}
                      style={{ width: 46, minWidth: 46, height: ROW_H }}>
                      <span className="text-[11px] font-mono text-gray-500">{ri + 1}</span>
                    </td>

                    {sheet.columns.map((col, ci) => {
                      const isEd   = editing?.r === ri && editing?.c === ci;
                      const isSel  = sel?.r === ri && sel?.c === ci;
                      const isFCol = ci < frozenCols;
                      const isPen  = AUTO_COLS.has(col.id);
                      const raw    = row.cells[col.id] ?? "";
                      const disp   = evalFormula(raw);
                      const st     = gs(row.id, col.id);
                      const nick   = row.cells[sheet.columns[0]?.id] ?? "";

                      return (
                        <td key={col.id}
                          className={`relative border-r border-b border-gray-200 p-0 overflow-visible
                            ${isFRow || isFCol ? "z-10" : ""}
                            ${isSel ? "outline outline-2 outline-[#1a73e8] z-20" : ""}`}
                          style={{
                            width: getW(col), minWidth: getW(col), maxWidth: getW(col), height: ROW_H,
                            ...(isFRow ? { background: "#f1f8e9" } : {}),
                            ...(isFCol ? { background: "#fff8e1" } : {}),
                          }}
                          onClick={() => { setSel({ r: ri, c: ci }); if (editing?.r !== ri || editing?.c !== ci) cancelEdit(); }}
                          onDoubleClick={() => startEdit(ri, ci)}
                        >
                          {isPen ? (
                            <PenaltyCell value={raw} colId={col.id} canEdit={canEditCells}
                              onSave={(v, reason) => {
                                setCell(row.id, col.id, v);
                                if (onPenaltyChange)
                                  onPenaltyChange(nick, col.id === COL_ID_VERBAL ? "verbal" : "reprimand", parseInt(v), reason);
                              }} />
                          ) : isEd ? (
                            <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => {
                                if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                                if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSel({ r: ri, c: Math.min(ci + 1, sheet.columns.length - 1) }); }
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="absolute inset-0 w-full h-full px-2 text-[12px] outline outline-2 outline-[#1a73e8] bg-white z-30 font-mono"
                              style={buildCellStyle(st)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center px-2 overflow-hidden" style={buildCellStyle(st)}>
                              <span className="truncate" style={{ width: "100%", textAlign: st.align ?? "left" }}>{disp}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Delete row button */}
                    <td className="border-b border-gray-200 text-center" style={{ width: 28 }}>
                      {canEditCells && (
                        <button onClick={() => delRow(row.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1">
                          <Icon name="X" size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sheet tab ── */}
      <div className="flex items-center border-t border-gray-300 bg-[#f8f9fa] px-2 py-1 gap-1" style={{ minHeight: 28 }}>
        <div className="flex items-center gap-1 border border-gray-300 rounded-sm bg-white px-2 py-0.5 select-none">
          <Icon name="Table2" size={10} className="text-[#0f9d58]" />
          <span className="text-[11px] text-gray-700 font-medium ml-0.5">{sheet.name}</span>
        </div>
      </div>
    </div>
  );
}
