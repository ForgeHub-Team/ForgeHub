import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { roleIds } from "../../utils/constants";
import { EntityPage } from "../shared/EntityPage";
import type { User } from "../../types/user";
export function BranchStaffPage() { return <EntityPage<User> title="Branch Staff" loader={() => usersApi.getUsersByRole(roleIds.Staff)} createLabel="Create staff" columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "workspace", label: "Workspace" }, { key: "isActive", label: "Active", badge: true }]} form={(close, reload) => <UserForm onSubmit={async (v) => { await usersApi.createUser({ ...v, roleId: roleIds.Staff }); close(); await reload(); }} />} />; }
