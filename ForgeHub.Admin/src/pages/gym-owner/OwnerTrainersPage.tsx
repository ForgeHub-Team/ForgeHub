import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { roleIds } from "../../utils/constants";
import { EntityPage } from "../shared/EntityPage";
import type { User } from "../../types/user";
export function OwnerTrainersPage() { return <EntityPage<User> title="Trainers" loader={() => usersApi.getUsersByRole(roleIds.Trainer)} createLabel="Create trainer" columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "workspace", label: "Workspace" }, { key: "isActive", label: "Active", badge: true }]} form={(close, reload) => <UserForm onSubmit={async (v) => { await usersApi.createUser({ ...v, roleId: roleIds.Trainer }); close(); await reload(); }} />} />; }
