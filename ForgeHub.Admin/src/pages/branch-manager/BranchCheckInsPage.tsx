import { checkInsApi } from "../../api/checkInsApi";
import { EntityPage } from "../shared/EntityPage";
import type { CheckIn } from "../../types/checkIn";
export function BranchCheckInsPage() { return <EntityPage<CheckIn> title="Check-ins" loader={checkInsApi.getTodayAttendance} columns={[{ key: "memberName", label: "Member" }, { key: "status", label: "Status", badge: true }, { key: "at", label: "Time" }, { key: "source", label: "Source" }]} />; }
