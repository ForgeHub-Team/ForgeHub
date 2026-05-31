import { auditLogsApi, type AuditLog } from "../../api/auditLogsApi";
import { EntityPage } from "../shared/EntityPage";
export function AuditLogsPage() { return <EntityPage<AuditLog> title="Audit Logs" description="Read-only audit trail from the dedicated backend endpoint." loader={auditLogsApi.getAuditLogs} columns={[{ key: "action", label: "Action" }, { key: "userName", label: "Actor" }, { key: "tableName", label: "Table" }, { key: "recordId", label: "Record" }, { key: "createdAt", label: "Created" }]} />; }
