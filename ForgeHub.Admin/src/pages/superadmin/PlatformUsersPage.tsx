import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { EntityPage } from "../shared/EntityPage";
import type { User } from "../../types/user";
export function PlatformUsersPage() { return <EntityPage<User> title="Platform Users" description="All scoped admin users returned by the backend." loader={usersApi.getUsers} createLabel="Create user" columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role", badge: true }, { key: "workspace", label: "Workspace" }, { key: "isActive", label: "Active", badge: true }]} form={(close, reload) => <UserForm onSubmit={async (v) => { await usersApi.createUser(v); close(); await reload(); }} />} />; }
