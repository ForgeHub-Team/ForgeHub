import { dashboardApi } from "../../api/dashboardApi";
import { EntityPage } from "../shared/EntityPage";
import type { Branch } from "../../types/branch";
export function OwnerReportsPage() { return <EntityPage<Branch> title="Reports" loader={async () => (await dashboardApi.getWorkspace()).branches} columns={[{ key: "name", label: "Branch" }, { key: "members", label: "Members" }, { key: "revenue", label: "Revenue" }, { key: "activeToday", label: "Active today" }]} />; }
