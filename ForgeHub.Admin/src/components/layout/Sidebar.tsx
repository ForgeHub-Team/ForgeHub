import type { Role } from "../../types/auth";
import { RoleBasedMenu } from "./RoleBasedMenu";

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 bg-forge-sidebar p-5 text-white lg:block">
      <div className="mb-8">
        <div className="text-2xl font-black tracking-tight">ForgeHub</div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Admin OS</div>
      </div>
      <RoleBasedMenu role={role} />
    </aside>
  );
}
