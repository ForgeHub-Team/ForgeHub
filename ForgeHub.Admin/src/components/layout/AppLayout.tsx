import { Outlet } from "react-router-dom";
import { dashboardApi } from "../../api/dashboardApi";
import { useAuth } from "../../hooks/useAuth";
import { useApi } from "../../hooks/useApi";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const { session, logout } = useAuth();
  const workspace = useApi(() => dashboardApi.getWorkspace(), []);
  if (!session) return null;

  const gymName = workspace.data?.gyms.find((gym) => gym.id === session.user.gymId)?.name ?? workspace.data?.gyms[0]?.name;
  const branchName = workspace.data?.branches.find((branch) => branch.id === session.user.branchId)?.name ?? workspace.data?.branches[0]?.name;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar role={session.user.role} />
      <main className="min-w-0 flex-1 pb-24 lg:pb-0">
        <Topbar user={session.user} gymName={gymName} branchName={branchName} onLogout={() => void logout()} />
        <div className="mx-auto max-w-7xl px-3 py-4 sm:p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
      <MobileNav role={session.user.role} />
    </div>
  );
}
