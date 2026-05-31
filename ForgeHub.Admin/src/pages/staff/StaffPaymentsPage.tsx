import { paymentsApi } from "../../api/paymentsApi";
import { PaymentForm } from "../../components/forms/PaymentForm";
import { EntityPage } from "../shared/EntityPage";
import type { Payment } from "../../types/payment";
export function StaffPaymentsPage() { return <EntityPage<Payment> title="Payments" loader={paymentsApi.getPayments} createLabel="Record payment" columns={[{ key: "member", label: "Member" }, { key: "amount", label: "Amount" }, { key: "method", label: "Method" }, { key: "status", label: "Status", badge: true }, { key: "at", label: "Time" }]} form={(close, reload) => <PaymentForm onSubmit={async (v) => { await paymentsApi.createPayment(v); close(); await reload(); }} />} />; }
