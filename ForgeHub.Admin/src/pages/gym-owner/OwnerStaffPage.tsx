import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { EntityPage } from "../shared/EntityPage";
import type { User } from "../../types/user";
export function OwnerStaffPage() { return <EntityPage<User> title="Staff" loader={usersApi.getUsers} createLabel="Create staff user" columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role", badge: true }, { key: "workspace", label: "Workspace" }]} form={(close, reload) => <UserForm onSubmit={async (v) => { await usersApi.createUser(v); close(); await reload(); }} />} />; }
