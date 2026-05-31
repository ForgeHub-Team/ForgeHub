import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { roleIds } from "../../utils/constants";
import { EntityPage } from "../shared/EntityPage";
import type { User } from "../../types/user";
export function GymOwnersPage() { return <EntityPage<User> title="Gym Owners" description="Gym owner users loaded from the users API." loader={() => usersApi.getUsersByRole(roleIds.GymOwner)} createLabel="Create owner" columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "workspace", label: "Workspace" }, { key: "isActive", label: "Active", badge: true }]} form={(close, reload) => <UserForm onSubmit={async (v) => { await usersApi.createUser({ ...v, roleId: roleIds.GymOwner }); close(); await reload(); }} />} />; }
