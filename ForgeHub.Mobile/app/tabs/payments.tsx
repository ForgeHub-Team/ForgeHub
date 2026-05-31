import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text } from "react-native";
import { getPayments } from "@/api/paymentsApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors } from "@/theme/colors";

function formatAmount(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PaymentsTab() {
  const query = useQuery({ queryKey: ["payments"], queryFn: getPayments });

  return (
    <ForgeScreen title="Payments" subtitle="Your billing history" refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {query.data?.length === 0 ? <EmptyState title="No payments yet" message="Membership payments will appear here after staff records them." /> : null}
      {query.data?.map((payment) => (
        <ForgeCard key={payment.id} style={styles.card}>
          <Text style={styles.amount}>{formatAmount(payment.amountValue ?? payment.amount)}</Text>
          <Text style={styles.meta}>{payment.method ?? "Payment"} - {payment.status ?? "Paid"}</Text>
          <Text style={styles.meta}>{formatDate(payment.paidAt ?? payment.at)}</Text>
          {payment.notes ? <Text style={styles.notes}>{payment.notes}</Text> : null}
        </ForgeCard>
      ))}
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  amount: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: 0 },
  meta: { color: colors.muted, fontWeight: "800" },
  notes: { color: colors.warm, fontWeight: "700", lineHeight: 20 }
});
