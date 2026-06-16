import { useQuery } from "@tanstack/react-query";
import { getAvailableMembershipPlans, getMembership } from "@/api/membershipApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { MembershipPlan } from "@/types/membership";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function MembershipScreen() {
  const query = useQuery({ queryKey: ["membership"], queryFn: getMembership });
  const plansQuery = useQuery({ queryKey: ["membership-plans"], queryFn: getAvailableMembershipPlans });
  const membership = query.data;
  const availablePlans = plansQuery.data ?? [];
  return (
    <ForgeScreen
      title="Membership"
      subtitle="Plan and usage"
      refreshing={query.isRefetching || plansQuery.isRefetching}
      onRefresh={() => {
        query.refetch();
        plansQuery.refetch();
      }}
    >
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {membership ? (
        <>
          {membership.currentMembership ? (
            <ForgeCard style={styles.card}>
              <View style={styles.row}><Text style={styles.title}>{membership.currentMembership.planName}</Text><StatusBadge label={membership.currentMembership.status} tone={toneForStatus(membership.currentMembership.status)} /></View>
              <Text style={styles.text}>{membership.currentMembership.isActive ? "Your membership is active." : "Membership is not active."}</Text>
            </ForgeCard>
          ) : <EmptyState title="No active membership" message="Membership history will still appear here when available." />}
          <View style={styles.metrics}>
            <MetricCard label="Days remaining" value={membership.remainingDays} accent />
            <MetricCard label="Visits this month" value={membership.visitsThisMonth} />
          </View>
          <Text style={styles.section}>Available plans</Text>
          {plansQuery.isLoading ? <LoadingState /> : null}
          {plansQuery.error ? <Text style={styles.text}>Available plans could not be loaded right now.</Text> : null}
          {!plansQuery.isLoading && !plansQuery.error && availablePlans.length === 0 ? (
            <EmptyState title="No available plans" message="Active membership plans will appear here when available." />
          ) : null}
          {availablePlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} currentPlanId={membership.currentMembership?.planId ?? null} />
          ))}
          {membership.branchAccess.length > 0 ? <Text style={styles.section}>Accessible branches</Text> : null}
          {membership.branchAccess.map((branch) => (
            <ForgeCard key={branch.branchId} style={styles.card}>
              <View style={styles.row}><Text style={styles.branchTitle}>{branch.branchName}</Text><StatusBadge label={branch.status ?? "Unknown"} tone={branch.canCheckIn ? "success" : "warning"} /></View>
              <Text style={styles.text}>{branch.address || "Address not available"}</Text>
              <Text style={styles.text}>{branch.remainingSpots ?? 0} spots available</Text>
            </ForgeCard>
          ))}
          <Text style={styles.section}>Membership history</Text>
          {membership.memberships.length === 0 ? <EmptyState title="No membership history" message="Your memberships will appear here once assigned." /> : null}
          {membership.memberships.map((item) => (
            <ForgeCard key={item.id} style={styles.card}>
              <View style={styles.row}><Text style={styles.branchTitle}>{item.planName}</Text><StatusBadge label={item.status} tone={toneForStatus(item.status)} /></View>
              <Text style={styles.text}>{item.startDate ?? "No start date"} to {item.endDate ?? "No end date"}</Text>
              <Text style={styles.text}>{item.remainingDays} days remaining</Text>
            </ForgeCard>
          ))}
        </>
      ) : null}
    </ForgeScreen>
  );
}

function PlanCard({ plan, currentPlanId }: { plan: MembershipPlan; currentPlanId?: number | null }) {
  const duration = plan.durationMonth ?? plan.durationMonths ?? 0;
  const branchNames = plan.branches?.map((branch) => branch.name).filter(Boolean) ?? [];
  const features = [
    accessTypeLabel(plan.accessType),
    plan.includesClasses ? "Classes included" : null,
    plan.includesPt ? "PT included" : null
  ].filter(Boolean);
  const isCurrent = currentPlanId !== null && currentPlanId !== undefined && plan.id === currentPlanId;

  return (
    <ForgeCard style={[styles.card, isCurrent ? styles.currentPlan : null]}>
      <View style={styles.row}>
        <View style={styles.planHeader}>
          <Text style={styles.branchTitle}>{plan.name}</Text>
          <Text style={styles.planPrice}>{formatPrice(plan.price)}{duration > 0 ? ` / ${duration} ${duration === 1 ? "month" : "months"}` : ""}</Text>
        </View>
        {isCurrent ? <StatusBadge label="Current" tone="success" /> : null}
      </View>
      {features.length > 0 ? <Text style={styles.text}>{features.join(" - ")}</Text> : null}
      <Text style={styles.text}>{branchNames.length > 0 ? `Branches: ${branchNames.join(", ")}` : "All eligible branches"}</Text>
    </ForgeCard>
  );
}

function formatPrice(value?: number | null) {
  if (value === null || value === undefined) return "Price not available";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function accessTypeLabel(value?: string | null) {
  switch (value) {
    case "full-access":
      return "Full access";
    case "DAY_PASS":
      return "Day pass";
    case "one_branch":
      return "One branch";
    case "multi-branch":
      return "Multi-branch";
    default:
      return "Standard access";
  }
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  currentPlan: { borderColor: colors.success },
  planHeader: { flex: 1, gap: 4 },
  planPrice: { color: colors.text, fontSize: 15, fontWeight: "900", letterSpacing: 0 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", flex: 1, letterSpacing: 0 },
  branchTitle: { color: colors.text, fontSize: 17, fontWeight: "900", flex: 1, letterSpacing: 0 },
  text: { color: colors.muted, fontWeight: "700" },
  metrics: { flexDirection: "row", gap: 12 },
  section: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0, marginTop: 4 }
});
