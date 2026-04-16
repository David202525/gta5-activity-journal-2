import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { RoleBadge } from "@/components/shared/PlayerRow";
import OrgList from "@/components/hud/OrgList";
import AdminStaffPanel from "@/components/hud/AdminStaffPanel";
import AdminRolesPanel from "@/components/hud/AdminRolesPanel";
import { apiGetSettings, apiUpdateSettings, apiGetSettings2, apiUpdateSettings2 } from "@/lib/api";
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
      {isMainCurator && <VkChatSettings2 />}
    </div>
  );
}

// ─── VK CHAT SETTINGS ────────────────────────────────────────
function parseVkLink(input: string): string {
  const trimmed = input.trim();
  // Уже peer_id число
  if (/^\d+$/.test(trimmed)) return trimmed;
  // Ссылка-приглашение vk.me/join/... — нельзя получить peer_id из неё напрямую, вернём как есть для подсказки
  // Ссылка на беседу vk.com/im?sel=cXXX
  const selMatch = trimmed.match(/[?&]sel=c(\d+)/i);
  if (selMatch) return String(2000000000 + parseInt(selMatch[1]));
  // Группа vk.com/clubXXX или vk.com/publicXXX
  const clubMatch = trimmed.match(/vk\.com\/(?:club|public)(\d+)/i);
  if (clubMatch) return String(-parseInt(clubMatch[1]));
  // Короткое имя группы vk.com/название — вернём пустым, нужен ID
  return "";
}

function VkChatSettings() {
  const [chatFaction, setChatFaction] = useState("");
  const [chatAdmin, setChatAdmin]     = useState("");
  const [saved, setSaved]             = useState(false);
  const [extraChats, setExtraChats]   = useState<{ id: string; label: string; link: string }[]>([]);

  useEffect(() => {
    apiGetSettings().then(s => {
      setChatFaction(String(s.chat_faction ?? ""));
      setChatAdmin(String(s.chat_admin ?? ""));
      if (Array.isArray(s.extra_chats)) setExtraChats(s.extra_chats.map(c => ({ ...c, link: c.id })));
    }).catch(() => {});
  }, []);

  const handleLinkInput = (val: string, setter: (v: string) => void) => {
    const parsed = parseVkLink(val);
    setter(parsed || val);
  };

  const save = async () => {
    await apiUpdateSettings({
      chat_faction: chatFaction ? parseInt(chatFaction) : null,
      chat_admin:   chatAdmin   ? parseInt(chatAdmin)   : null,
      extra_chats:  extraChats.filter(c => c.id.trim()).map(({ label, id }) => ({ label, id })),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addExtra = () => setExtraChats(p => [...p, { id: "", label: "", link: "" }]);
  const removeExtra = (i: number) => setExtraChats(p => p.filter((_, idx) => idx !== i));
  const updateExtraLink = (i: number, val: string) => {
    const parsed = parseVkLink(val);
    setExtraChats(p => p.map((c, idx) => idx === i ? { ...c, link: val, id: parsed || val.replace(/\D/g, "") } : c));
  };
  const updateExtraLabel = (i: number, val: string) =>
    setExtraChats(p => p.map((c, idx) => idx === i ? { ...c, label: val } : c));

  const inputCls = "flex-1 border border-purple-800/40 text-purple-100 text-xs px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none bg-transparent focus:border-violet-600/50 transition-all";

  return (
    <div className="hud-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="MessageSquare" size={13} className="text-green-400" />
        <span className="font-hud text-xs tracking-widest text-purple-400/80">БЕСЕДЫ ВКонтакте</span>
      </div>

      <div className="mb-4 rounded-lg border border-purple-900/30 bg-purple-950/20 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon name="Info" size={11} className="text-purple-400" />
          <span className="text-[10px] font-hud tracking-widest text-purple-400">КАК ДОБАВИТЬ БЕСЕДУ ИЛИ ГРУППУ</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-hud text-violet-500 w-4 flex-shrink-0">1.</span>
          <span className="text-[10px] font-mono-hud text-purple-300/70 leading-relaxed">
            Вставь ссылку-приглашение: <span className="text-cyan-400">vk.me/join/FFob...</span>
            — откроется беседа, добавь бота и он пришлёт peer_id
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-hud text-violet-500 w-4 flex-shrink-0">2.</span>
          <span className="text-[10px] font-mono-hud text-purple-300/70 leading-relaxed">
            Или вставь ссылку на беседу из браузера: <span className="text-cyan-400">vk.com/im?sel=c<span className="text-yellow-400">145</span></span> → peer_id рассчитается автоматически
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-hud text-violet-500 w-4 flex-shrink-0">3.</span>
          <span className="text-[10px] font-mono-hud text-purple-300/70 leading-relaxed">
            Для группы: ссылка <span className="text-cyan-400">vk.com/club<span className="text-yellow-400">12345</span></span> или просто вставь <span className="text-green-400">peer_id</span> числом напрямую
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-hud text-cyan-400 w-32">БЕСЕДА ФРАКЦИЙ:</span>
          <input
            value={chatFaction}
            onChange={e => handleLinkInput(e.target.value, setChatFaction)}
            placeholder="Ссылка или peer_id"
            className={inputCls}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-hud text-violet-400 w-32">БЕСЕДА АДМИНОВ:</span>
          <input
            value={chatAdmin}
            onChange={e => handleLinkInput(e.target.value, setChatAdmin)}
            placeholder="Ссылка или peer_id"
            className={inputCls}
          />
        </div>

        {extraChats.length > 0 && (
          <div className="mt-1 space-y-2 border-t border-purple-900/30 pt-3">
            <span className="text-[10px] font-hud text-purple-500 tracking-widest">ДОПОЛНИТЕЛЬНЫЕ БЕСЕДЫ:</span>
            {extraChats.map((chat, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={chat.label}
                  onChange={e => updateExtraLabel(i, e.target.value)}
                  placeholder="Название"
                  className="w-36 border border-purple-800/40 text-purple-100 text-xs px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none bg-transparent focus:border-violet-600/50 transition-all"
                />
                <input
                  value={chat.link || chat.id}
                  onChange={e => updateExtraLink(i, e.target.value)}
                  placeholder="Ссылка или peer_id"
                  className={inputCls}
                />
                {chat.id && chat.link !== chat.id && (
                  <span className="text-[9px] font-mono-hud text-green-500 whitespace-nowrap">→ {chat.id}</span>
                )}
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

function VkChatSettings2() {
  const [chatAdmin, setChatAdmin]     = useState("");
  const [saved, setSaved]             = useState(false);
  const [extraChats, setExtraChats]   = useState<{ id: string; label: string; link: string }[]>([]);

  useEffect(() => {
    apiGetSettings2().then(s => {
      setChatAdmin(String(s.chat_admin ?? ""));
      if (Array.isArray(s.extra_chats)) setExtraChats(s.extra_chats.map(c => ({ ...c, link: c.id })));
    }).catch(() => {});
  }, []);

  const handleLinkInput = (val: string, setter: (v: string) => void) => {
    const parsed = parseVkLink(val);
    setter(parsed || val);
  };

  const save = async () => {
    await apiUpdateSettings2({
      chat_admin: chatAdmin ? parseInt(chatAdmin) : null,
      extra_chats: extraChats.filter(c => c.id.trim()).map(({ label, id }) => ({ label, id })),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addExtra = () => setExtraChats(p => [...p, { id: "", label: "", link: "" }]);
  const removeExtra = (i: number) => setExtraChats(p => p.filter((_, idx) => idx !== i));
  const updateExtraLink = (i: number, val: string) => {
    const parsed = parseVkLink(val);
    setExtraChats(p => p.map((c, idx) => idx === i ? { ...c, link: val, id: parsed || val.replace(/\D/g, "") } : c));
  };
  const updateExtraLabel = (i: number, val: string) =>
    setExtraChats(p => p.map((c, idx) => idx === i ? { ...c, label: val } : c));

  const inputCls = "flex-1 border border-purple-800/40 text-purple-100 text-xs px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none bg-transparent focus:border-violet-600/50 transition-all";

  return (
    <div className="hud-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="MessageSquare" size={13} className="text-cyan-400" />
        <span className="font-hud text-xs tracking-widest text-purple-400/80">БЕСЕДЫ ВКонтакте (Бот 2)</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-hud text-cyan-400 w-32">ОСНОВНАЯ БЕСЕДА:</span>
          <input value={chatAdmin} onChange={e => handleLinkInput(e.target.value, setChatAdmin)}
            placeholder="Ссылка или peer_id" className={inputCls} />
        </div>

        {extraChats.length > 0 && (
          <div className="mt-1 space-y-2 border-t border-purple-900/30 pt-3">
            <span className="text-[10px] font-hud text-purple-500 tracking-widest">ДОПОЛНИТЕЛЬНЫЕ БЕСЕДЫ:</span>
            {extraChats.map((chat, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={chat.label} onChange={e => updateExtraLabel(i, e.target.value)}
                  placeholder="Название"
                  className="w-36 border border-purple-800/40 text-purple-100 text-xs px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none bg-transparent focus:border-violet-600/50 transition-all" />
                <input value={chat.link || chat.id} onChange={e => updateExtraLink(i, e.target.value)}
                  placeholder="Ссылка или peer_id" className={inputCls} />
                {chat.id && chat.link !== chat.id && (
                  <span className="text-[9px] font-mono-hud text-green-500 whitespace-nowrap">→ {chat.id}</span>
                )}
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
        </div>
      </div>
    </div>
  );
}