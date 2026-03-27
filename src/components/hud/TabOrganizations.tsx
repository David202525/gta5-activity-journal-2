import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { RoleBadge } from "@/components/shared/PlayerRow";
import OrgList from "@/components/hud/OrgList";
import AdminStaffPanel from "@/components/hud/AdminStaffPanel";
import AdminRolesPanel from "@/components/hud/AdminRolesPanel";
import {
  AuthUser, Player, Organization, Notification, Role, isCuratorRole,
} from "@/lib/types";

// ─── ORGANIZATIONS TAB ────────────────────────────────────────
interface TabOrganizationsProps {
  viewerRole: Role;
  authUser: AuthUser;
  players: Player[];
  orgs: Organization[];
  selectedOrgId: number | null;
  myOrg: Organization | null;
  onSetSelectedOrgId: (id: number | null) => void;
  onUpdateOrg: (org: Organization) => void;
  onDeleteOrg?: (id: number) => void;
  onUpdatePlayer: (id: number, fields: Partial<Player>) => void;
  onNotify: (note: Omit<Notification, "id" | "read">) => void;
  onOrgCreated: (org: Organization) => void;
}

export function TabOrganizations({
  viewerRole, authUser, players, orgs, selectedOrgId, myOrg,
  onSetSelectedOrgId, onUpdateOrg, onDeleteOrg, onUpdatePlayer, onNotify, onOrgCreated,
}: TabOrganizationsProps) {

  const visibleOrgs = (() => {
    if (viewerRole === "curator") return orgs;
    if (viewerRole === "curator_faction") return orgs.filter(o => o.curatorId === authUser.id);
    if (viewerRole === "leader") return myOrg ? [myOrg] : [];
    if (viewerRole === "deputy" || viewerRole === "user") return myOrg ? [myOrg] : orgs.filter(o => o.memberIds.includes(authUser.id));
    return orgs;
  })();

  return (
    <div className="animate-fade-in">
      <OrgList
        viewerRole={viewerRole}
        authUser={authUser}
        players={players}
        orgs={orgs}
        visibleOrgs={visibleOrgs}
        selectedOrgId={selectedOrgId}
        myOrg={myOrg}
        onSetSelectedOrgId={onSetSelectedOrgId}
        onUpdateOrg={onUpdateOrg}
        onDeleteOrg={onDeleteOrg}
        onUpdatePlayer={onUpdatePlayer}
        onNotify={onNotify}
        onOrgCreated={onOrgCreated}
      />
    </div>
  );
}

// ─── ADMIN PANEL TAB ──────────────────────────────────────────
interface TabAdminPanelProps {
  viewerRole: Role;
  authUser: AuthUser;
  players: Player[];
  canSeeFullStats: boolean;
  onlinePlayers: number;
  totalOnlineToday: number;
  onFetchPlayers: () => void;
  onRoleChange?: (id: number, role: Role) => void;
  onStatusChange?: (id: number, status: "online" | "afk" | "offline") => void;
}

export function TabAdminPanel({
  viewerRole, authUser, players, canSeeFullStats,
  onlinePlayers, totalOnlineToday, onFetchPlayers, onRoleChange, onStatusChange,
}: TabAdminPanelProps) {
  const isMainCurator    = viewerRole === "curator";
  const isCuratorAdmin   = viewerRole === "curator_admin";
  const isCuratorFaction = viewerRole === "curator_faction";
  const isSubCurator     = isCuratorAdmin || isCuratorFaction;

  const subCuratorTargets = isSubCurator
    ? players.filter(p => {
        if (isCuratorAdmin)   return p.role === "admin" || p.role === "user";
        if (isCuratorFaction) return p.role === "leader" || p.role === "deputy" || p.role === "user";
        return false;
      })
    : [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="font-hud text-sm tracking-wider text-purple-400">ПАНЕЛЬ АДМИНИСТРАТОРА</div>
        <RoleBadge role={viewerRole} />
      </div>

      <AdminStaffPanel
        viewerRole={viewerRole}
        players={players}
        canSeeFullStats={canSeeFullStats}
        onlinePlayers={onlinePlayers}
        totalOnlineToday={totalOnlineToday}
        isMainCurator={isMainCurator}
        isCuratorAdmin={isCuratorAdmin}
        onStatusChange={onStatusChange}
      />

      <AdminRolesPanel
        viewerRole={viewerRole}
        authUser={authUser}
        players={players}
        isMainCurator={isMainCurator}
        isCuratorAdmin={isCuratorAdmin}
        isCuratorFaction={isCuratorFaction}
        isSubCurator={isSubCurator}
        subCuratorTargets={subCuratorTargets}
        onFetchPlayers={onFetchPlayers}
        onRoleChange={onRoleChange}
      />

      {isMainCurator && <VkChatSettings />}
    </div>
  );
}

// ─── VK CHAT SETTINGS ────────────────────────────────────────
function VkChatSettings() {
  const [chatFaction, setChatFaction] = useState("");
  const [chatAdmin, setChatAdmin]     = useState("");
  const [saved, setSaved]             = useState(false);
  const [extraChats, setExtraChats]   = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(s => {
      setChatFaction(String(s.chat_faction ?? ""));
      setChatAdmin(String(s.chat_admin ?? ""));
      if (Array.isArray(s.extra_chats)) setExtraChats(s.extra_chats);
    }).catch(() => {});
  }, []);

  const save = async () => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_faction: chatFaction ? parseInt(chatFaction) : null,
        chat_admin:   chatAdmin   ? parseInt(chatAdmin)   : null,
        extra_chats:  extraChats.filter(c => c.id.trim()),
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addExtra = () => setExtraChats(p => [...p, { id: "", label: "" }]);
  const removeExtra = (i: number) => setExtraChats(p => p.filter((_, idx) => idx !== i));
  const updateExtra = (i: number, field: "id" | "label", val: string) =>
    setExtraChats(p => p.map((c, idx) => idx === i ? { ...c, [field]: field === "id" ? val.replace(/\D/g, "") : val } : c));

  const inputCls = "flex-1 border border-purple-800/40 text-purple-100 text-xs px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none bg-transparent focus:border-violet-600/50 transition-all";

  return (
    <div className="hud-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="MessageSquare" size={13} className="text-green-400" />
        <span className="font-hud text-xs tracking-widest text-purple-400/80">БЕСЕДЫ ВКонтакте</span>
        <span className="text-[10px] font-mono-hud text-purple-800 ml-auto">peer_id беседы</span>
      </div>
      <div className="mb-4 rounded-lg border border-purple-900/30 bg-purple-950/20 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon name="Info" size={11} className="text-purple-400" />
          <span className="text-[10px] font-hud tracking-widest text-purple-400">КАК УЗНАТЬ PEER_ID БЕСЕДЫ</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-hud text-violet-500 w-4 flex-shrink-0">1.</span>
          <span className="text-[10px] font-mono-hud text-purple-300/70 leading-relaxed">Открой беседу в VK через браузер (не приложение)</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-hud text-violet-500 w-4 flex-shrink-0">2.</span>
          <span className="text-[10px] font-mono-hud text-purple-300/70 leading-relaxed">В адресной строке найди: <span className="text-cyan-400">vk.com/im?sel=c<span className="text-yellow-400">145</span></span> — число после "c" это номер беседы</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-hud text-violet-500 w-4 flex-shrink-0">3.</span>
          <span className="text-[10px] font-mono-hud text-purple-300/70 leading-relaxed">Прибавь <span className="text-green-400">2000000000</span> к номеру → пример: c<span className="text-yellow-400">145</span> = <span className="text-green-400">2000000145</span></span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-hud text-violet-500 w-4 flex-shrink-0">★</span>
          <span className="text-[10px] font-mono-hud text-purple-300/70 leading-relaxed">Или: добавь бота в беседу и напиши любое сообщение — бот сам пришлёт peer_id</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-hud text-cyan-400 w-32">БЕСЕДА ФРАКЦИЙ:</span>
          <input value={chatFaction} onChange={e => setChatFaction(e.target.value.replace(/\D/g, ""))}
            placeholder="2000000001" className={inputCls} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-hud text-violet-400 w-32">БЕСЕДА АДМИНОВ:</span>
          <input value={chatAdmin} onChange={e => setChatAdmin(e.target.value.replace(/\D/g, ""))}
            placeholder="2000000002" className={inputCls} />
        </div>

        {extraChats.length > 0 && (
          <div className="mt-1 space-y-2 border-t border-purple-900/30 pt-3">
            <span className="text-[10px] font-hud text-purple-500 tracking-widest">ДОПОЛНИТЕЛЬНЫЕ БЕСЕДЫ:</span>
            {extraChats.map((chat, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={chat.label}
                  onChange={e => updateExtra(i, "label", e.target.value)}
                  placeholder="Название (необязательно)"
                  className="w-36 border border-purple-800/40 text-purple-100 text-xs px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none bg-transparent focus:border-violet-600/50 transition-all"
                />
                <input
                  value={chat.id}
                  onChange={e => updateExtra(i, "id", e.target.value)}
                  placeholder="peer_id"
                  className={inputCls}
                />
                <button onClick={() => removeExtra(i)}
                  className="p-1.5 rounded-lg text-red-500/60 hover:text-red-400 hover:bg-red-900/20 transition-all">
                  <Icon name="X" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button onClick={addExtra}
            className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-purple-900/20 border border-purple-700/30 text-purple-400 rounded-lg hover:bg-purple-800/30 transition-all flex items-center gap-1.5">
            <Icon name="Plus" size={10} /> ДОБАВИТЬ БЕСЕДУ
          </button>
          <button onClick={save}
            className="btn-hud text-[10px] font-hud tracking-wider px-4 py-1.5 bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 rounded-lg hover:bg-emerald-800/40 transition-all">
            СОХРАНИТЬ
          </button>
          {saved && <span className="text-[10px] font-mono-hud text-emerald-500">✓ Сохранено</span>}
          <span className="text-[10px] font-mono-hud text-purple-800 ml-auto">
            peer_id = 2000000000 + номер_беседы
          </span>
        </div>
      </div>
    </div>
  );
}