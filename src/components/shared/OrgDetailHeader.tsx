import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Organization, Player, Role, formatTime } from "@/lib/types";
import { RoleBadge } from "./PlayerRow";

interface OrgDetailHeaderProps {
  org: Organization;
  members: Player[];
  viewerRole: Role;
  onBack: () => void;
  onUpdate?: (org: Organization) => void;
}

export default function OrgDetailHeader({ org, members, viewerRole, onBack, onUpdate }: OrgDetailHeaderProps) {
  const onlineCount      = members.filter(p => p.status === "online").length;
  const afkCount         = members.filter(p => p.status === "afk").length;
  const totalOnlineToday = members.reduce((s, p) => s + p.onlineToday, 0);

  const canEdit = viewerRole === "curator" || viewerRole === "curator_faction" || viewerRole === "leader";

  const [editing, setEditing]     = useState(false);
  const [draftName, setName]       = useState(org.name);
  const [draftTag, setTag]         = useState(org.tag);
  const [draftDesc, setDesc]       = useState(org.description ?? "");

  const save = () => {
    onUpdate?.({ ...org, name: draftName.trim() || org.name, tag: draftTag.trim() || org.tag, description: draftDesc.trim() });
    setEditing(false);
  };

  const inputCls = "bg-transparent border border-purple-800/40 text-purple-100 text-sm px-2 py-1 rounded-lg font-mono-hud focus:outline-none focus:border-violet-600/50 transition-all";

  const canSeeBack = viewerRole === "curator" || viewerRole === "curator_faction";

  return (
    <>
      <div className="flex items-center gap-3">
        {canSeeBack && (
          <button onClick={onBack}
            className="w-8 h-8 rounded-lg bg-white/4 border border-purple-900/50 flex items-center justify-center hover:border-violet-600/40 hover:bg-violet-900/20 transition-all">
            <Icon name="ArrowLeft" size={13} className="text-purple-400" />
          </button>
        )}

        {editing ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <input value={draftName} onChange={e => setName(e.target.value)}
              placeholder="Название" maxLength={40}
              className={`${inputCls} w-40`} />
            <input value={draftTag} onChange={e => setTag(e.target.value)}
              placeholder="[ТЕГ]" maxLength={10}
              className={`${inputCls} w-20`} />
            <input value={draftDesc} onChange={e => setDesc(e.target.value)}
              placeholder="Описание..." maxLength={100}
              className={`${inputCls} flex-1 min-w-32`} />
            <button onClick={save}
              className="btn-hud text-[10px] font-hud px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 rounded-lg hover:bg-emerald-800/40 transition-all">
              СОХРАНИТЬ
            </button>
            <button onClick={() => { setEditing(false); setName(org.name); setTag(org.tag); setDesc(org.description ?? ""); }}
              className="text-[10px] text-purple-700 hover:text-purple-400 transition-colors px-1">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <span className="font-hud text-lg gradient-text">{org.name}</span>
            <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/80">{org.tag}</span>
            {canEdit && onUpdate && (
              <button onClick={() => setEditing(true)}
                className="ml-1 text-purple-800 hover:text-violet-400 transition-colors">
                <Icon name="Pencil" size={12} />
              </button>
            )}
          </div>
        )}

        {!editing && <RoleBadge role={viewerRole} />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "УЧАСТНИКОВ",   val: String(members.length),       icon: "Users",     cls: "text-purple-300" },
          { label: "ОНЛАЙН",       val: String(onlineCount),          icon: "Wifi",      cls: "text-emerald-400" },
          { label: "АФК",          val: String(afkCount),             icon: "Clock",     cls: "text-amber-400" },
          { label: "ОБЩИЙ ОНЛАЙН", val: formatTime(totalOnlineToday), icon: "BarChart2", cls: "text-violet-300" },
        ].map((item, i) => (
          <div key={i} className="hud-panel p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon name={item.icon} size={11} className="text-purple-700" />
              <span className="text-[10px] font-hud tracking-widest text-purple-700">{item.label}</span>
            </div>
            <div className={`font-hud text-xl ${item.cls}`}>{item.val}</div>
          </div>
        ))}
      </div>

      {!editing && org.description && (
        <div className="hud-panel px-5 py-3 flex items-center gap-2">
          <Icon name="Info" size={12} className="text-purple-700 flex-shrink-0" />
          <span className="text-xs text-purple-600 font-mono-hud">{org.description}</span>
        </div>
      )}
    </>
  );
}
