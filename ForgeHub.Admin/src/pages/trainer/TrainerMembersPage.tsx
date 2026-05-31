import { dashboardApi } from "../../api/dashboardApi";
import { EntityPage } from "../shared/EntityPage";
import type { Member } from "../../types/member";
export function TrainerMembersPage() { return <EntityPage<Member> title="My Members" loader={async () => (await dashboardApi.getWorkspace()).members} columns={[{ key: "name", label: "Member" }, { key: "phone", label: "Phone" }, { key: "status", label: "Status", badge: true }, { key: "attendanceToday", label: "Attendance", badge: true }]} />; }
