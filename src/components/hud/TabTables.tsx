import Icon from "@/components/ui/icon";
import HudTable from "@/components/shared/HudTable";
import {
  Player, Organization, Role, TableSheet, Penalty, Notification,
  COL_ID_VERBAL, COL_ID_REPRIMAND,
} from "@/lib/types";

function exportTableCSV(sheet: TableSheet) {
  const header = sheet.columns.map(c => `"${c.name}"`).join(";");
  const rows = sheet.rows.map(row =>
    sheet.columns.map(c => `"${(row.cells[c.id] ?? "").replace(/"/g, '""')}"`).join(";")
  );
  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sheet.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface TabTablesProps {
  viewerRole: Role;
  players: Player[];
  myOrg: Organization | null;
  orgTable: TableSheet;
  adminTable: TableSheet;
  onOrgTableChange: (t: TableSheet) => void;
  onAdminTableChange: (t: TableSheet) => void;
  onUpdatePlayer: (id: number, fields: Partial<Player>) => void;
  onNotify: (note: Omit<Notification, "id" | "read">) => void;
}

export default function TabTables({
  viewerRole, players, myOrg,
  orgTable, adminTable, onOrgTableChange, onAdminTableChange,
  onUpdatePlayer, onNotify,
}: TabTablesProps) {
  const canSeeAdmin     = viewerRole === "curator" || viewerRole === "curator_admin";
  const canSeeOrg       = viewerRole === "leader" || viewerRole === "curator" || viewerRole === "curator_faction" || viewerRole === "admin";
  const canEditOrgStructure   = viewerRole === "curator" || viewerRole === "curator_faction";
  const canEditAdminStructure = viewerRole === "curator" || viewerRole === "curator_admin";
  const canEditOrgCells   = viewerRole === "leader" || viewerRole === "curator" || viewerRole === "curator_faction";
  const canEditAdminCells = viewerRole === "curator" || viewerRole === "curator_admin";

  const syncPenalties = (sheet: TableSheet): TableSheet => ({
    ...sheet,
    rows: sheet.rows.map(row => {
      const nickname = row.cells[1] ?? "";
      const player = players.find(p => p.username.toLowerCase() === nickname.toLowerCase());
      if (!player) return row;
      const verbal    = player.penalties.filter(p => p.type === "verbal"    && p.isActive).length;
      const reprimand = player.penalties.filter(p => p.type === "reprimand" && p.isActive).length;
      return {
        ...row,
        cells: {
          ...row.cells,
          [COL_ID_VERBAL]:    String(verbal),
          [COL_ID_REPRIMAND]: String(reprimand),
        },
      };
    }),
  });

  const orgTableSynced   = syncPenalties(orgTable);
  const adminTableSynced = syncPenalties(adminTable);

  // Выдать / снять наказания по имени игрока, типу, кол-ву и причине
  const handlePenaltyChange = (nickname: string, type: "verbal" | "reprimand", count: number, reason: string) => {
    const player = players.find(p => p.username.toLowerCase() === nickname.toLowerCase());
    if (!player) return;

    const other = player.penalties.filter(p => p.type !== type || !p.isActive);
    const active: Penalty[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      type,
      reason,
      issuedBy: "",
      issuedAt: new Date().toISOString().slice(0, 10),
      isActive: true,
    }));

    onUpdatePlayer(player.id, { penalties: [...other, ...active] });

    if (count > 0) {
      const label = type === "verbal" ? "устное предупреждение" : "выговор";
      onNotify({
        type: "warning",
        text: `${nickname} получил ${label}: ${reason}`,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      });
    }
  };

  return (
    <div className="space-y-5 animate-fade-in -mx-4 px-4 md:-mx-8 md:px-8">
      {canSeeOrg && (
        <div className="flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <Icon name="Building2" size={13} className="text-violet-400" />
            <span className="font-hud text-sm tracking-wider text-purple-400">ТАБЛИЦА ОРГАНИЗАЦИИ</span>
            {myOrg && <span className="rank-badge text-[9px] font-hud px-2 py-0.5 text-violet-300/70">{myOrg.name}</span>}
            <a
              href="https://docs.google.com/spreadsheets/d/1a8bPuVyyDWixTKYSlsMLcNBsE5yC8-pNLJeh-wZvN7c/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 text-[10px] font-mono-hud text-purple-500 hover:text-purple-300 transition-colors px-2 py-1 rounded-lg hover:bg-purple-900/20"
            >
              <Icon name="ExternalLink" size={11} /> Открыть в Google
            </a>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-purple-900/40 shadow-[0_0_30px_rgba(139,92,246,0.08)]">
            <iframe
              src="https://docs.google.com/spreadsheets/d/1a8bPuVyyDWixTKYSlsMLcNBsE5yC8-pNLJeh-wZvN7c/edit?usp=sharing&rm=minimal"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title="Таблица организации"
            />
          </div>
        </div>
      )}

      {canSeeAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icon name="ShieldCheck" size={13} className="text-pink-400" />
            <span className="font-hud text-sm tracking-wider text-purple-400">ТАБЛИЦА АДМИНИСТРАЦИИ</span>
            {canEditAdminCells ? (
              <button
                onClick={() => exportTableCSV(adminTableSynced)}
                className="ml-auto flex items-center gap-1.5 text-[10px] font-mono-hud text-purple-500 hover:text-purple-300 transition-colors px-2 py-1 rounded-lg hover:bg-purple-900/20"
              >
                <Icon name="Download" size={11} /> Excel
              </button>
            ) : (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-mono-hud text-purple-800">
                <Icon name="Eye" size={10} /> только просмотр
              </span>
            )}
          </div>
          <HudTable
            sheet={adminTableSynced}
            canEditCells={canEditAdminCells}
            canEditStructure={canEditAdminStructure}
            onChange={onAdminTableChange}
            onPenaltyChange={handlePenaltyChange}
          />
        </div>
      )}

      {!canSeeOrg && !canSeeAdmin && (
        <div className="hud-panel p-10 text-center font-mono-hud text-xs text-purple-800">
          Нет доступа к таблицам
        </div>
      )}
    </div>
  );
}