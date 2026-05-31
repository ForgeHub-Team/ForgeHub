import { membersApi } from "../../api/membersApi";
import { MemberPersonalInfoPanel } from "../../components/members/MemberPersonalInfoPanel";
import { EntityPage } from "../shared/EntityPage";
import type { Member } from "../../types/member";
export function MemberSearchPage() { return <EntityPage<Member> title="Member Search" description="Search and filter branch members from the backend." loader={membersApi.getMembers} columns={[{ key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "status", label: "Status", badge: true }, { key: "attendanceToday", label: "Attendance", badge: true }]} detailRenderer={(row) => <>{row.id ? <MemberPersonalInfoPanel memberId={Number(row.id)} /> : null}</>} />; }
