import { checkInsApi } from "../../api/checkInsApi";
import { EntityPage } from "../shared/EntityPage";
import type { CheckIn } from "../../types/checkIn";
export function BranchReportsPage() { return <EntityPage<CheckIn> title="Branch Reports" loader={checkInsApi.getCheckInHistory} columns={[{ key: "memberName", label: "Member" }, { key: "status", label: "Status", badge: true }, { key: "at", label: "Time" }, { key: "source", label: "Source" }]} />; }
