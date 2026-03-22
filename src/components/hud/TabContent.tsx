import TabStats from "@/components/hud/TabStats";
import TabTables from "@/components/hud/TabTables";
import TabOrders from "@/components/hud/TabOrders";
import { TabLeaderboard, TabUsers, TabModeration } from "@/components/hud/TabModeration";
import { TabOrganizations, TabAdminPanel } from "@/components/hud/TabOrganizations";
import {
  AuthUser, Player, Organization, Notification, TableSheet, Order, Role, Tab,
} from "@/lib/types";

interface TabContentProps {
  activeTab: Tab;
  authUser: AuthUser;
  myStatus?: string;
  viewerRole: Role;
  players: Player[];
  orgs: Organization[];
  selectedOrgId: number | null;
  loadingPlayers: boolean;
  myOrg: Organization | null;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  canSeeFullStats: boolean;
  onlinePlayers: number;
  afkPlayers: number;
  totalOnlineToday: number;
  sorted: Player[];
  myRank: number;
  onFetchPlayers: () => void;
  onAddWarning: (id: number) => void;
  onRemoveWarning: (id: number) => void;
  onEditPlayer: (id: number, fields: { username?: string; rank?: string }) => void;
  onSetSelectedOrgId: (id: number | null) => void;
  onUpdateOrg: (org: Organization) => void;
  onUpdatePlayer: (id: number, fields: Partial<Player>) => void;
  onNotify: (note: Omit<Notification, "id" | "read">) => void;
  onOrgCreated: (org: Organization) => void;
  onRoleChange?: (id: number, role: Role) => void;
  orgTable: TableSheet;
  adminTable: TableSheet;
  onOrgTableChange: (t: TableSheet) => void;
  onAdminTableChange: (t: TableSheet) => void;
  orders: Order[];
  onAddOrder: (order: Order) => void;
  onDeleteOrder?: (id: number) => void;
}

export default function TabContent({
  activeTab, authUser, myStatus, viewerRole, players, orgs,
  selectedOrgId, loadingPlayers, myOrg,
  canManageUsers, canAccessAdmin, canSeeFullStats,
  onlinePlayers, afkPlayers, totalOnlineToday,
  sorted, myRank, onRoleChange,
  orgTable, adminTable, onOrgTableChange, onAdminTableChange,
  orders, onAddOrder, onDeleteOrder,
  onFetchPlayers, onAddWarning, onRemoveWarning, onEditPlayer,
  onSetSelectedOrgId, onUpdateOrg, onUpdatePlayer, onNotify, onOrgCreated,
}: TabContentProps) {

  if (activeTab === "stats") {
    const freshMe = players.find(p => p.id === authUser.id);
    const statsUser = freshMe ? { ...authUser, ...freshMe } : authUser;
    return <TabStats authUser={statsUser} myRank={myRank} isOnline={myStatus === "online"} />;
  }

  if (activeTab === "leaderboard")
    return <TabLeaderboard sorted={sorted} canSeeFullStats={canSeeFullStats} loadingPlayers={loadingPlayers} />;

  if (activeTab === "users" && canManageUsers)
    return (
      <TabUsers
        players={players} viewerRole={viewerRole} myOrg={myOrg}
        onFetchPlayers={onFetchPlayers} onAddWarning={onAddWarning}
        onRemoveWarning={onRemoveWarning} onEditPlayer={onEditPlayer}
        onRoleChange={onRoleChange}
      />
    );

  if (activeTab === "moderation" && canManageUsers)
    return <TabModeration players={players} onRemoveWarning={onRemoveWarning} />;

  if (activeTab === "orders")
    return (
      <TabOrders
        authUser={authUser} viewerRole={viewerRole} players={players}
        orders={orders} onAddOrder={onAddOrder} onDeleteOrder={onDeleteOrder} onNotify={onNotify}
      />
    );

  if (activeTab === "tables")
    return (
      <TabTables
        viewerRole={viewerRole} players={players} myOrg={myOrg}
        orgTable={orgTable} adminTable={adminTable}
        onOrgTableChange={onOrgTableChange} onAdminTableChange={onAdminTableChange}
        onUpdatePlayer={onUpdatePlayer} onNotify={onNotify}
      />
    );

  if (activeTab === "organizations" && (viewerRole === "curator" || viewerRole === "curator_admin" || viewerRole === "curator_faction" || viewerRole === "leader"))
    return (
      <TabOrganizations
        viewerRole={viewerRole} authUser={authUser} players={players}
        orgs={orgs} selectedOrgId={selectedOrgId} myOrg={myOrg}
        onSetSelectedOrgId={onSetSelectedOrgId} onUpdateOrg={onUpdateOrg}
        onUpdatePlayer={onUpdatePlayer} onNotify={onNotify} onOrgCreated={onOrgCreated}
      />
    );

  if (activeTab === "admin_panel" && canAccessAdmin)
    return (
      <TabAdminPanel
        viewerRole={viewerRole} authUser={authUser} players={players}
        canSeeFullStats={canSeeFullStats} onlinePlayers={onlinePlayers}
        totalOnlineToday={totalOnlineToday} onFetchPlayers={onFetchPlayers}
        onRoleChange={onRoleChange}
      />
    );

  return null;
}