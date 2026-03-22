import Icon from "@/components/ui/icon";
import { Player, STATUS_COLORS } from "@/lib/types";
import { RoleBadge } from "./PlayerRow";

interface OrgAddMemberProps {
  addSearch: string;
  notMembers: Player[];
  onSearchChange: (val: string) => void;
  onAdd: (playerId: number) => void;
}

export default function OrgAddMember({ addSearch, notMembers, onSearchChange, onAdd }: OrgAddMemberProps) {
  return (
    <div className="hud-panel p-5">
      <div className="font-hud text-xs tracking-widest text-purple-600 mb-3 flex items-center gap-2">
        <Icon name="UserPlus" size={12} className="text-violet-400" />
        ДОБАВИТЬ УЧАСТНИКА
      </div>
      <input
        value={addSearch}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Начните вводить ник..."
        className="w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-2.5 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 bg-transparent focus:border-violet-600/50 transition-all mb-3"
      />
      {addSearch.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {notMembers.length === 0 ? (
            <div className="text-xs font-mono-hud text-purple-800 px-2 py-2">Не найдено</div>
          ) : notMembers.slice(0, 8).map(p => (
            <div key={p.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-900/30 cursor-pointer border border-transparent hover:border-purple-800/30 transition-all"
              onClick={() => onAdd(p.id)}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[p.status]}`} />
              <span className="font-hud text-sm text-purple-200 flex-1">{p.username}</span>
              <RoleBadge role={p.role} />
              <Icon name="Plus" size={12} className="text-violet-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
