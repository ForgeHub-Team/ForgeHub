import { usersApi } from "../../api/usersApi";
import { EntityPage } from "../shared/EntityPage";
import type { User } from "../../types/user";
import { roleIds } from "../../utils/constants";
export function BranchTrainersPage() { return <EntityPage<User> title="Branch Trainers" loader={() => usersApi.getUsersByRole(roleIds.Trainer)} columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "workspace", label: "Workspace" }, { key: "isActive", label: "Active", badge: true }]} />; }
