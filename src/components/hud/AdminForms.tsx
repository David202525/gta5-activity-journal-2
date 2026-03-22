import { useState } from "react";
import Icon from "@/components/ui/icon";
import HudSelect from "@/components/ui/hud-select";
import { Organization, Player, Role } from "@/lib/types";
import { dbAddPlayer, dbGetAll } from "@/lib/localDb";

// ─── ADD USER FORM ────────────────────────────────────────────
export function AddUserForm({ viewerRole, currentUsername, onAdded }: {
  viewerRole: Role; currentUsername: string; onAdded: () => void;
}) {
  const [form, setForm] = useState({ username: "", password: "", role: "user", title: "Новобранец", rank: "1" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) { setMsg({ text: "Заполните ник и пароль", ok: false }); return; }
    setLoading(true); setMsg(null);
    const exists = dbGetAll().find(u => u.username === form.username);
    if (exists) { setMsg({ text: "Участник с таким ником уже существует", ok: false }); setLoading(false); return; }
    dbAddPlayer(form);
    setMsg({ text: `Участник ${form.username} добавлен!`, ok: true });
    setForm({ username: "", password: "", role: "user", title: "Новобранец", rank: "1" });
    onAdded();
    setLoading(false);
  };

  const inputCls = "w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-2.5 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 transition-all";
  const labelCls = "text-[10px] font-hud tracking-widest text-purple-600 uppercase block mb-2";

  return (
    <div className="hud-panel p-6">
      <div className="font-hud text-xs tracking-widest text-purple-400/70 mb-5 flex items-center gap-2">
        <Icon name="UserPlus" size={13} className="text-violet-400" />
        ДОБАВИТЬ УЧАСТНИКА
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Ник</label>
            <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className={inputCls} placeholder="Имя_игрока" />
          </div>
          <div>
            <label className={labelCls}>Пароль</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={inputCls} placeholder="••••••••" />
          </div>
          <div>
            <label className={labelCls}>Звание</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Рядовой" />
          </div>
          <div>
            <label className={labelCls}>Ранг</label>
            <input
              value={form.rank}
              onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}
              className={inputCls}
              placeholder="1"
              maxLength={10}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Роль</label>
            <HudSelect
              value={form.role}
              onChange={v => setForm(p => ({ ...p, role: v }))}
              options={[
                { value: "user",    label: "ИГРОК",          color: "text-zinc-300" },
                { value: "deputy",  label: "ЗАМЕСТИТЕЛЬ",    color: "text-orange-400" },
                { value: "leader",  label: "ЛИДЕР",          color: "text-amber-400" },
                ...(viewerRole === "admin" || viewerRole === "curator"
                  ? [{ value: "admin", label: "АДМИНИСТРАТОР", color: "text-indigo-400" }] : []),
                ...(viewerRole === "curator"
                  ? [{ value: "curator", label: "КУРАТОР", color: "text-pink-400" }] : []),
              ]}
            />
          </div>
        </div>
        {msg && (
          <div className={`text-xs font-mono-hud px-4 py-2.5 rounded-lg border flex items-center gap-2 ${msg.ok ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8" : "text-red-400 border-red-500/20 bg-red-500/8"}`}>
            <Icon name={msg.ok ? "CheckCircle" : "AlertCircle"} size={12} />
            {msg.text}
          </div>
        )}
        <button type="submit" disabled={loading}
          className="btn-hud font-hud text-[11px] tracking-widest px-6 py-3 text-white rounded-xl disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
          {loading ? "ДОБАВЛЕНИЕ..." : "ДОБАВИТЬ В ОРГАНИЗАЦИЮ"}
        </button>
      </form>
    </div>
  );
}

// ─── CREATE ORG FORM ──────────────────────────────────────────
export function CreateOrgForm({ players, onCreated }: { players: Player[]; onCreated: (org: Organization) => void }) {
  const [form, setForm] = useState({ name: "", tag: "", description: "", leaderId: "" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const leaders = players.filter(p => p.role === "leader" || p.role === "admin");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.tag.trim()) { setMsg({ text: "Название и тег обязательны", ok: false }); return; }
    const leader = leaders.find(l => l.id === Number(form.leaderId));
    const org: Organization = {
      id: Date.now(), name: form.name.trim(), tag: form.tag.trim(),
      description: form.description.trim(), leaderId: leader?.id ?? null,
      leaderName: leader?.username ?? "—", memberIds: [],
      orgRanks: [], memberRanks: {},
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onCreated(org);
    setMsg({ text: `Организация «${org.name}» создана!`, ok: true });
    setForm({ name: "", tag: "", description: "", leaderId: "" });
  };

  const inputCls = "w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-2.5 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 bg-transparent focus:border-violet-600/50 transition-all";
  const labelCls = "text-[10px] font-hud tracking-widest text-purple-600 uppercase block mb-2";

  return (
    <div className="hud-panel p-6">
      <div className="font-hud text-xs tracking-widest text-purple-400/70 mb-5 flex items-center gap-2">
        <Icon name="Building2" size={13} className="text-violet-400" />
        СОЗДАТЬ ОРГАНИЗАЦИЮ
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Название</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Shadow Legion" />
          </div>
          <div>
            <label className={labelCls}>Тег</label>
            <input value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} className={inputCls} placeholder="[SL]" maxLength={8} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Описание</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputCls} placeholder="Краткое описание организации" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Лидер организации</label>
            <HudSelect
              value={form.leaderId}
              onChange={v => setForm(p => ({ ...p, leaderId: v }))}
              placeholder="— Без лидера —"
              options={[
                { value: "", label: "— Без лидера —", color: "text-purple-600" },
                ...leaders.map(l => ({
                  value: String(l.id),
                  label: `${l.username} (${l.role})`,
                  color: l.role === "admin" ? "text-indigo-400" : "text-amber-400",
                })),
              ]}
            />
          </div>
        </div>
        {msg && (
          <div className={`text-xs font-mono-hud px-4 py-2.5 rounded-lg border flex items-center gap-2 ${msg.ok ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8" : "text-red-400 border-red-500/20 bg-red-500/8"}`}>
            <Icon name={msg.ok ? "CheckCircle" : "AlertCircle"} size={12} />
            {msg.text}
          </div>
        )}
        <button type="submit"
          className="btn-hud font-hud text-[11px] tracking-widest px-6 py-3 text-white rounded-xl transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
          СОЗДАТЬ ОРГАНИЗАЦИЮ
        </button>
      </form>
    </div>
  );
}