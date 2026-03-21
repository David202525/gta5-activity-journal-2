import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import HudSelect from "@/components/ui/hud-select";
import { OrgRank, ORG_RANK_COLORS } from "@/lib/types";

// ─── РЕДАКТИРУЕМАЯ СТРОКА РАНГА ───────────────────────────────
function RankRow({ rank, canEdit, onRename, onDelete }: {
  rank: OrgRank;
  canEdit: boolean;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(rank.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(rank.name); }, [rank.name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== rank.name) onRename(rank.id, trimmed);
    else setDraft(rank.name);
    setEditing(false);
  };

  const dotCls = rank.color.replace("text-", "bg-");

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-900/15 border border-purple-800/20 group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />

      {canEdit && editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(rank.name); setEditing(false); }
          }}
          maxLength={24}
          className={`font-hud text-sm flex-1 bg-purple-900/50 border border-violet-600/50 rounded-md px-2 py-0.5 outline-none focus:border-violet-400/70 ${rank.color}`}
        />
      ) : (
        <span
          className={`font-hud text-sm flex-1 ${rank.color} ${canEdit ? "cursor-text" : ""}`}
          onClick={() => canEdit && setEditing(true)}
          title={canEdit ? "Нажмите для переименования" : undefined}
        >
          {rank.name}
        </span>
      )}

      {canEdit && !editing && (
        <Icon name="Pencil" size={11}
          className="text-purple-800/50 hover:text-violet-400 cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
          onClick={() => setEditing(true)}
        />
      )}

      {canEdit && (
        <button
          onClick={() => onDelete(rank.id)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-purple-800 hover:text-red-400 hover:bg-red-900/20 transition-all"
          title="Удалить ранг"
        >
          <Icon name="X" size={11} />
        </button>
      )}
    </div>
  );
}

// ─── ПАНЕЛЬ РАНГОВ ────────────────────────────────────────────
interface OrgRanksPanelProps {
  ranks: OrgRank[];
  canEdit: boolean;
  onChange: (ranks: OrgRank[]) => void;
}

export default function OrgRanksPanel({ ranks, canEdit, onChange }: OrgRanksPanelProps) {
  const [newName, setNewName]   = useState("");
  const [newColor, setNewColor] = useState("text-sky-400");
  const [error, setError]       = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setError("Введите название ранга"); return; }
    if (ranks.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("Ранг с таким именем уже существует"); return;
    }
    onChange([...ranks, { id: Date.now(), name: trimmed, color: newColor }]);
    setNewName("");
    setError("");
  };

  const handleRename = (id: number, name: string) => {
    if (ranks.some(r => r.id !== id && r.name.toLowerCase() === name.toLowerCase())) return;
    onChange(ranks.map(r => r.id === id ? { ...r, name } : r));
  };

  const handleDelete = (id: number) => {
    onChange(ranks.filter(r => r.id !== id));
  };

  return (
    <div className="hud-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Tag" size={13} className="text-violet-400" />
        <span className="font-hud text-xs tracking-widest text-purple-400/80">РАНГИ ОРГАНИЗАЦИИ</span>
        <span className="text-[10px] font-mono-hud text-purple-700 ml-auto">{ranks.length} / 10</span>
      </div>

      {ranks.length === 0 ? (
        <div className="text-[11px] font-mono-hud text-purple-800 mb-4">Рангов пока нет</div>
      ) : (
        <div className="space-y-1.5 mb-4">
          {ranks.map(rank => (
            <RankRow
              key={rank.id}
              rank={rank}
              canEdit={canEdit}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {canEdit && ranks.length < 10 && (
        <div className="space-y-3 pt-3 border-t border-purple-900/30">
          <div className="text-[10px] font-hud tracking-widest text-purple-700">ДОБАВИТЬ РАНГ</div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Название ранга..."
              maxLength={24}
              className="flex-1 border border-purple-800/40 text-purple-100 text-sm px-3 py-2 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/50 bg-transparent focus:border-violet-600/50 transition-all"
            />
            <div className="w-36 flex-shrink-0">
              <HudSelect
                value={newColor}
                onChange={setNewColor}
                options={ORG_RANK_COLORS.map(c => ({ value: c.value, label: c.label, color: c.value }))}
              />
            </div>
            <button
              onClick={handleAdd}
              className="btn-hud px-3 py-2 rounded-xl border border-violet-700/50 bg-violet-900/30 hover:bg-violet-800/40 transition-all flex-shrink-0"
              title="Добавить"
            >
              <Icon name="Plus" size={14} className="text-violet-300" />
            </button>
          </div>
          {error && (
            <div className="text-[11px] font-mono-hud text-red-400 flex items-center gap-1.5">
              <Icon name="AlertCircle" size={11} />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
