export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontSize?: number;
  color?: string;
  bg?: string;
  align?: "left" | "center" | "right";
}

export type CellStyles = Record<string, CellStyle>;

export const AUTO_COLS = new Set([6, 7]); // COL_ID_VERBAL, COL_ID_REPRIMAND
export const COL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const colLetter = (i: number) =>
  i < 26 ? COL_LETTERS[i] : COL_LETTERS[Math.floor(i / 26) - 1] + COL_LETTERS[i % 26];

export const DEFAULT_COL_W = 150;
export const ROW_H = 28;
export const HEADER_H = 28;

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

export const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#ffffff",
  "#ea4335", "#fbbc04", "#34a853", "#4285f4", "#ab47bc", "#26a69a", "#ef5350", "#42a5f5",
  "#ff9900", "#ff4500", "#d32f2f", "#1565c0", "#2e7d32", "#6a1b9a", "#00838f", "#f57f17",
];

export const BG_COLORS = [
  "transparent", "#ffffff", "#f8f9fa", "#fce8b2", "#b7e1cd", "#c9daf8", "#fce5cd", "#ead1dc",
  "#ea9999", "#ffe599", "#b6d7a8", "#9fc5e8", "#b4a7d6", "#a2c4c9", "#dd7e6b", "#6fa8dc",
];

export const buildCellStyle = (st: CellStyle): React.CSSProperties => ({
  fontWeight:     st.bold ? "bold" : undefined,
  fontStyle:      st.italic ? "italic" : undefined,
  textDecoration: [st.underline ? "underline" : "", st.strike ? "line-through" : ""].filter(Boolean).join(" ") || undefined,
  fontSize:       `${st.fontSize ?? 12}px`,
  color:          st.color ?? "#202124",
  background:     st.bg && st.bg !== "transparent" ? st.bg : undefined,
  textAlign:      st.align ?? "left",
});

export const evalFormula = (v: string): string => {
  if (!v.startsWith("=")) return v;
  try {
    return String(Function(`"use strict";return (${v.slice(1).replace(/[^0-9+\-*/.() ]/g, "")})`)());
  } catch {
    return v;
  }
};