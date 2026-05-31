import { dashboardApi } from "../../api/dashboardApi";
import { EntityPage } from "../shared/EntityPage";
import type { Gym } from "../../types/gym";
export function PlatformReportsPage() { return <EntityPage<Gym> title="Platform Reports" description="Revenue and member performance by gym from backend workspace." loader={async () => (await dashboardApi.getWorkspace()).gyms} columns={[{ key: "name", label: "Gym" }, { key: "members", label: "Members" }, { key: "branches", label: "Branches" }, { key: "monthlyRevenue", label: "Revenue" }, { key: "status", label: "Status", badge: true }]} />; }
