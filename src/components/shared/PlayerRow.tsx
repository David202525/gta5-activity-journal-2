import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Player, Role, Status, STATUS_COLORS, STATUS_LABELS, ROLE_LABELS, formatTime, canEditTarget } from "@/lib/types";


export function RoleBadge({ role }: { role: Role }) {
  const cls: Record<Role, string> = {
    user:             "text-zinc-400   border-zinc-700   bg-zinc-800/40",
    leader:           "text-amber-400  border-amber-800  bg-amber-900/20",
    deputy:           "text-orange-400 border-orange-800 bg-orange-900/20",
    admin:            "text-indigo-400 border-indigo-800 bg-indigo-900/20",
    curator:          "text-pink-400   border-pink-800   bg-pink-900/20",
    curator_admin:    "text-violet-400 border-violet-800 bg-violet-900/20",
    curator_faction:  "text-cyan-400   border-cyan-800   bg-cyan-900/20",
  };
  return (
    <span className={`text-[9px] font-hud tracking-widest px-2 py-0.5 border rounded-full ${cls[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

export function StatusDot({ status }: { status: Status }) {
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[status]}`} />;
}

export function XPBar({ value, max, color = "xp-bar" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({ label, value, icon, sub, delay = 0 }: {
  label: string; value: string; icon: string; sub?: string; delay?: number;
}) {
  return (
    <div className="hud-panel stat-card p-5 animate-fade-in" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-hud tracking-widest text-purple-600 uppercase">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-violet-900/40 flex items-center justify-center">
          <Icon name={icon} size={13} className="text-violet-400" />
        </div>
      </div>
      <div className="font-hud text-2xl gradient-text">{value}</div>
      {sub && <div className="text-xs text-purple-700 mt-1 font-mono-hud">{sub}</div>}
    </div>
  );
}

export default function PlayerRow({ player, index, canEdit, viewerRole, onAddWarning, onRemoveWarning, onEditPlayer, onRoleChange, onChangePassword }: {
  player: Player; index: number; canEdit: boolean;
  viewerRole?: Role;
  onAddWarning?: (id: number, reason: string) => void;
  onRemoveWarning?: (id: number) => void;
  onEditPlayer?: (id: number, fields: { username?: string; rank?: string; title?: string; vk_id?: number | null }) => void;
  onRoleChange?: (id: number, role: Role) => void;
  onChangePassword?: (id: number, newPassword: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingRank, setEditingRank] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [editingVkId, setEditingVkId] = useState(false);
  const [addingWarning, setAddingWarning] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const [warningReason, setWarningReason] = useState("");
  const [draftName, setDraftName] = useState(player.username);
  const [draftTitle, setDraftTitle] = useState(player.title);
  const [draftRank, setDraftRank] = useState(player.rank);
  const [draftVkId, setDraftVkId] = useState(String((player as Player & { vk_id?: number | null }).vk_id ?? ""));
  const nameRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const rankRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const vkIdRef = useRef<HTMLInputElement>(null);

  // Права: можно ли данному viewer редактировать этого player
  const canEditThis = canEdit && !!viewerRole && canEditTarget(viewerRole, player.role);

  // Роли которые может назначить этот viewer данному player
  const availableRoles: { role: Role; label: string; cls: string }[] = (() => {
    if (!viewerRole || !onRoleChange || !canEditThis) return [];
    if (viewerRole === "curator") return [
      { role: "leader",  label: "ЛИДЕР",          cls: "text-amber-400 border-amber-700/50 bg-amber-900/25 hover:bg-amber-800/40" },
      { role: "deputy",  label: "ЗАМЕСТИТЕЛЬ",    cls: "text-orange-400 border-orange-700/50 bg-orange-900/25 hover:bg-orange-800/40" },
      { role: "admin",   label: "АДМИНИСТРАТОР",  cls: "text-indigo-400 border-indigo-700/50 bg-indigo-900/25 hover:bg-indigo-800/40" },
      { role: "user",    label: "ИГРОК",          cls: "text-zinc-500 border-zinc-700/40 bg-zinc-900/20 hover:bg-zinc-800/30" },
    ];
    if (viewerRole === "curator_faction") return [
      { role: "leader",  label: "ЛИДЕР",          cls: "text-amber-400 border-amber-700/50 bg-amber-900/25 hover:bg-amber-800/40" },
      { role: "deputy",  label: "ЗАМЕСТИТЕЛЬ",    cls: "text-orange-400 border-orange-700/50 bg-orange-900/25 hover:bg-orange-800/40" },
      { role: "user",    label: "ИГРОК",          cls: "text-zinc-500 border-zinc-700/40 bg-zinc-900/20 hover:bg-zinc-800/30" },
    ];
    if (viewerRole === "curator_admin") return [
      { role: "admin",   label: "АДМИНИСТРАТОР",  cls: "text-indigo-400 border-indigo-700/50 bg-indigo-900/25 hover:bg-indigo-800/40" },
      { role: "user",    label: "ИГРОК",          cls: "text-zinc-500 border-zinc-700/40 bg-zinc-900/20 hover:bg-zinc-800/30" },
    ];
    return [];
  })().filter(r => r.role !== player.role); // не показываем текущую роль

  useEffect(() => { setDraftName(player.username); }, [player.username]);
  useEffect(() => { setDraftTitle(player.title); }, [player.title]);
  useEffect(() => { setDraftRank(player.rank); }, [player.rank]);
  useEffect(() => { if (editingUsername) nameRef.current?.focus(); }, [editingUsername]);
  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (editingRank) rankRef.current?.focus(); }, [editingRank]);
  useEffect(() => { if (addingWarning) reasonRef.current?.focus(); }, [addingWarning]);
  useEffect(() => { if (editingVkId) vkIdRef.current?.focus(); }, [editingVkId]);

  const commitVkId = () => {
    const val = draftVkId.trim();
    const parsed = val ? parseInt(val) : null;
    onEditPlayer?.(player.id, { vk_id: parsed });
    setEditingVkId(false);
  };

  const resetVkBinding = () => {
    onEditPlayer?.(player.id, { vk_id: null, vk_peer_id: null } as never);
    setDraftVkId("");
  };

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== player.username) onEditPlayer?.(player.id, { username: trimmed });
    else setDraftName(player.username);
    setEditingUsername(false);
  };

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== player.title) onEditPlayer?.(player.id, { title: trimmed });
    else setDraftTitle(player.title);
    setEditingTitle(false);
  };

  const commitRank = () => {
    const trimmed = draftRank.trim();
    if (trimmed && trimmed !== player.rank) onEditPlayer?.(player.id, { rank: trimmed });
    else setDraftRank(player.rank);
    setEditingRank(false);
  };

  return (
    <div className="animate-fade-in" style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}>
      <div
        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all rounded-xl mx-2 my-0.5
          ${expanded
            ? "bg-purple-900/20 border border-purple-700/30"
            : "border border-transparent hover:bg-purple-900/10 hover:border-purple-800/20"
          }`}
        onClick={() => { if (!editingUsername && !editingRank) setExpanded(!expanded); }}
      >
        <div className="font-mono-hud text-xs text-purple-900/80 w-5 text-center">{index + 1}</div>
        <StatusDot status={player.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* USERNAME */}
            {canEditThis && editingUsername ? (
              <input
                ref={nameRef}
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setDraftName(player.username); setEditingUsername(false); } }}
                onClick={e => e.stopPropagation()}
                className="font-hud text-sm tracking-wide text-purple-100 bg-purple-900/50 border border-violet-600/50 rounded-lg px-2 py-0.5 outline-none w-36 focus:border-violet-400/70"
              />
            ) : (
              <span
                className={`font-hud text-sm tracking-wide text-purple-100 ${canEditThis ? "cursor-text hover:text-violet-300 transition-colors" : ""}`}
                onClick={e => { if (canEditThis) { e.stopPropagation(); setEditingUsername(true); } }}
                title={canEditThis ? "Нажмите для редактирования" : undefined}
              >
                {player.username}
              </span>
            )}

            {/* RANK */}
            {canEditThis && editingRank ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <span className="text-[9px] font-hud text-violet-400/60">РАНГ</span>
                <input
                  ref={rankRef}
                  value={draftRank}
                  onChange={e => setDraftRank(e.target.value)}
                  onBlur={commitRank}
                  onKeyDown={e => { if (e.key === "Enter") commitRank(); if (e.key === "Escape") { setDraftRank(player.rank); setEditingRank(false); } }}
                  maxLength={10}
                  className="font-hud text-[9px] text-violet-200 bg-purple-900/50 border border-violet-600/50 rounded-md px-2 py-0.5 outline-none w-16 focus:border-violet-400/70"
                />
                <button onClick={() => { setDraftRank(player.rank); setEditingRank(false); }} className="text-[10px] text-purple-700 hover:text-purple-400">✕</button>
              </div>
            ) : (
              <span
                className={`rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/80 ${canEditThis ? "cursor-pointer hover:text-violet-200 hover:border-violet-500/50 transition-all" : ""}`}
                onClick={e => { if (canEditThis) { e.stopPropagation(); setEditingRank(true); } }}
                title={canEditThis ? "Нажмите для смены ранга" : undefined}
              >
                РАНГ {player.rank}
              </span>
            )}

            {canEditThis && !editingUsername && !editingRank && (
              <Icon name="Pencil" size={10} className="text-purple-800/60 hover:text-violet-400 cursor-pointer transition-colors"
                onClick={e => { e.stopPropagation(); setEditingUsername(true); }} />
            )}
          </div>
          {/* TITLE (звание) */}
          {canEditThis && editingTitle ? (
            <input
              ref={titleRef}
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setDraftTitle(player.title); setEditingTitle(false); } }}
              onClick={e => e.stopPropagation()}
              maxLength={32}
              className="text-[10px] text-purple-300 font-mono-hud mt-0.5 bg-purple-900/50 border border-violet-600/50 rounded-md px-2 py-0.5 outline-none w-36 focus:border-violet-400/70"
            />
          ) : (
            <div
              className={`text-[10px] font-mono-hud mt-0.5 ${canEditThis ? "text-purple-500 cursor-text hover:text-purple-300 transition-colors" : "text-purple-700"}`}
              onClick={e => { if (canEditThis) { e.stopPropagation(); setEditingTitle(true); } }}
              title={canEditThis ? "Нажмите для изменения звания" : undefined}
            >
              {player.title || "—"}
            </div>
          )}
        </div>
        <div className="hidden sm:block"><RoleBadge role={player.role} /></div>
        <div className="text-right min-w-[64px]">
          <div className="font-hud text-sm neon-gold">LVL {player.level}</div>
          <div className="text-[10px] text-purple-700 font-mono-hud">{player.reputation.toLocaleString()} REP</div>
        </div>
        <div className="hidden md:block text-right w-20">
          <div className="text-xs text-purple-400 font-mono-hud">{formatTime(player.onlineToday)}</div>
          <div className="text-[10px] text-purple-800 font-mono-hud">сегодня</div>
        </div>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-purple-700 flex-shrink-0" />
      </div>

      {expanded && (
        <div className="mx-3 mb-2 p-4 bg-purple-950/40 border border-purple-800/20 rounded-xl animate-scale-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "ОНЛАЙН НЕДЕЛЯ", val: formatTime(player.onlineWeek), cls: "text-purple-300" },
              {
                label: "СТАТУС",
                val: STATUS_LABELS[player.status],
                cls: player.status === "online" ? "neon-green" : player.status === "afk" ? "text-amber-400" : "text-zinc-500",
              },
              {
                label: "ПРЕДУПРЕЖДЕНИЯ",
                val: player.warnings > 0 ? `⚠ ${player.warnings}` : "—",
                cls: player.warnings > 0 ? "neon-red" : "text-purple-800",
              },
              { label: "XP", val: `${player.xp.toLocaleString()} / ${player.xpMax.toLocaleString()}`, cls: "text-purple-300" },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-[10px] text-purple-800 font-hud tracking-wider mb-1">{item.label}</div>
                <div className={`text-sm font-mono-hud ${item.cls}`}>{item.val}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-800 font-hud w-14">XP</span>
              <XPBar value={player.xp} max={player.xpMax} color="xp-bar" />
              <span className="text-[10px] font-mono-hud text-purple-700 w-8 text-right">{Math.round((player.xp / player.xpMax) * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-800 font-hud w-14">REP</span>
              <XPBar value={player.reputation} max={10000} color="rep-bar" />
              <span className="text-[10px] font-mono-hud text-purple-700 w-8 text-right">{Math.round((player.reputation / 10000) * 100)}%</span>
            </div>
          </div>
          {canEdit && canEditThis && (
            <div className="mt-2 mb-2 space-y-1.5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Icon name="MessageCircle" size={11} className="text-purple-700 flex-shrink-0" />
                <span className="text-[10px] font-hud tracking-widest text-purple-700">VK ID</span>
                {!editingVkId ? (
                  <span
                    className="text-[10px] font-mono-hud text-purple-500 cursor-text hover:text-violet-300 transition-colors"
                    onClick={() => setEditingVkId(true)}
                    title="Нажмите для изменения VK ID"
                  >
                    {draftVkId || "не привязан"}
                  </span>
                ) : (
                  <input
                    ref={vkIdRef}
                    value={draftVkId}
                    onChange={e => setDraftVkId(e.target.value.replace(/\D/g, ""))}
                    onBlur={commitVkId}
                    onKeyDown={e => { if (e.key === "Enter") commitVkId(); if (e.key === "Escape") setEditingVkId(false); }}
                    placeholder="123456789"
                    className="text-[10px] font-mono-hud bg-purple-900/50 border border-violet-600/50 rounded-md px-2 py-0.5 outline-none w-32 text-purple-100 focus:border-violet-400/70"
                  />
                )}
                {draftVkId && canEditThis && (
                  <button onClick={resetVkBinding}
                    className="text-[9px] font-hud px-2 py-0.5 rounded-md border border-red-700/40 text-red-400/70 hover:text-red-400 hover:bg-red-900/20 transition-all">
                    СБРОС
                  </button>
                )}
              </div>
              {(player as Player & { vk_peer_id?: number | null }).vk_peer_id && (
                <div className="flex items-center gap-2">
                  <Icon name="Hash" size={11} className="text-purple-700 flex-shrink-0" />
                  <span className="text-[10px] font-hud tracking-widest text-purple-700">БЕСЕДА</span>
                  <span className="text-[10px] font-mono-hud text-cyan-600">
                    {(player as Player & { vk_peer_id?: number | null }).vk_peer_id}
                  </span>
                </div>
              )}
            </div>
          )}
          {canEdit && (
            <div className="mt-4 pt-3 border-t border-purple-900/40 space-y-2.5">
              {/* Предупреждения */}
              <div className="space-y-2" onClick={e => e.stopPropagation()}>
                {!addingWarning ? (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setAddingWarning(true)}
                      className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-lg hover:bg-red-500/18 transition-all">
                      + ПРЕДУПРЕЖДЕНИЕ
                    </button>
                    {player.warnings > 0 && (
                      <button onClick={() => onRemoveWarning?.(player.id)}
                        className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg hover:bg-emerald-500/18 transition-all">
                        СНЯТЬ ПРЕДУПР.
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] font-hud tracking-widest text-red-400/80">ПРИЧИНА ВЗЫСКАНИЯ</div>
                    <div className="flex gap-2">
                      <input
                        ref={reasonRef}
                        value={warningReason}
                        onChange={e => setWarningReason(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && warningReason.trim()) {
                            onAddWarning?.(player.id, warningReason.trim());
                            setWarningReason(""); setAddingWarning(false);
                          }
                          if (e.key === "Escape") { setWarningReason(""); setAddingWarning(false); }
                        }}
                        placeholder="Укажите причину..."
                        maxLength={120}
                        className="flex-1 border border-red-800/40 text-purple-100 text-[11px] px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none placeholder:text-purple-900/50 bg-transparent focus:border-red-600/50 transition-all"
                      />
                      <button
                        disabled={!warningReason.trim()}
                        onClick={() => { onAddWarning?.(player.id, warningReason.trim()); setWarningReason(""); setAddingWarning(false); }}
                        className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/25 transition-all disabled:opacity-40">
                        ВЫДАТЬ
                      </button>
                      <button onClick={() => { setWarningReason(""); setAddingWarning(false); }}
                        className="text-[10px] text-purple-800 hover:text-purple-400 px-1.5 transition-colors">
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Смена роли — только кураторам */}
              {availableRoles.length > 0 && (
                <div onClick={e => e.stopPropagation()}>
                  {!editingRole ? (
                    <button onClick={() => setEditingRole(true)}
                      className="btn-hud flex items-center gap-1.5 text-[10px] font-hud tracking-wider px-3 py-1.5 bg-purple-900/30 border border-purple-700/40 text-purple-400 rounded-lg hover:bg-purple-800/40 transition-all">
                      <Icon name="UserCog" size={11} /> СМЕНИТЬ РОЛЬ
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-hud text-purple-700 mr-1">→</span>
                      {availableRoles.map(r => (
                        <button key={r.role}
                          onClick={() => { onRoleChange?.(player.id, r.role); setEditingRole(false); }}
                          className={`btn-hud text-[10px] font-hud tracking-wider px-2.5 py-1.5 rounded-lg border transition-all ${r.cls}`}>
                          {r.label}
                        </button>
                      ))}
                      <button onClick={() => setEditingRole(false)}
                        className="text-[10px] text-purple-800 hover:text-purple-400 px-1 transition-colors">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Смена пароля — только куратору */}
              {onChangePassword && canEditThis && (
                <div onClick={e => e.stopPropagation()}>
                  {!changingPassword ? (
                    <button onClick={() => { setChangingPassword(true); setTimeout(() => passwordRef.current?.focus(), 50); }}
                      className="btn-hud flex items-center gap-1.5 text-[10px] font-hud tracking-wider px-3 py-1.5 bg-blue-900/20 border border-blue-700/40 text-blue-400 rounded-lg hover:bg-blue-800/30 transition-all">
                      <Icon name="KeyRound" size={11} /> СМЕНИТЬ ПАРОЛЬ
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-hud tracking-widest text-blue-400/80">НОВЫЙ ПАРОЛЬ ДЛЯ {player.username.toUpperCase()}</div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={passwordRef}
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Новый пароль..."
                          maxLength={64}
                          className="flex-1 min-w-[140px] border border-blue-800/40 text-purple-100 text-[11px] px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none placeholder:text-purple-900/50 bg-transparent focus:border-blue-600/50 transition-all"
                        />
                        <input
                          type="password"
                          value={newPasswordConfirm}
                          onChange={e => setNewPasswordConfirm(e.target.value)}
                          placeholder="Повторите пароль..."
                          maxLength={64}
                          onKeyDown={e => {
                            if (e.key === "Enter" && newPassword && newPassword === newPasswordConfirm) {
                              onChangePassword(player.id, newPassword);
                              setNewPassword(""); setNewPasswordConfirm(""); setChangingPassword(false);
                            }
                            if (e.key === "Escape") { setNewPassword(""); setNewPasswordConfirm(""); setChangingPassword(false); }
                          }}
                          className="flex-1 min-w-[140px] border border-blue-800/40 text-purple-100 text-[11px] px-3 py-1.5 rounded-lg font-mono-hud focus:outline-none placeholder:text-purple-900/50 bg-transparent focus:border-blue-600/50 transition-all"
                        />
                        <button
                          disabled={!newPassword || newPassword !== newPasswordConfirm}
                          onClick={() => { onChangePassword(player.id, newPassword); setNewPassword(""); setNewPasswordConfirm(""); setChangingPassword(false); }}
                          className="btn-hud text-[10px] font-hud tracking-wider px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-all disabled:opacity-40">
                          СОХРАНИТЬ
                        </button>
                        <button onClick={() => { setNewPassword(""); setNewPasswordConfirm(""); setChangingPassword(false); }}
                          className="text-[10px] text-purple-800 hover:text-purple-400 px-1.5 transition-colors">
                          ✕
                        </button>
                      </div>
                      {newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm && (
                        <div className="text-[10px] text-red-400/70 font-hud">Пароли не совпадают</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}