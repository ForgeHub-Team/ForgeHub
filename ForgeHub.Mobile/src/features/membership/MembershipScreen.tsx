import { useQuery } from "@tanstack/react-query";
import { getMembership } from "@/api/membershipApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function MembershipScreen() {
  const query = useQuery({ queryKey: ["membership"], queryFn: getMembership });
  const membership = query.data;
  return (
    <ForgeScreen title="Membership" subtitle="Plan and usage" refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
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

const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", flex: 1, letterSpacing: 0 },
  branchTitle: { color: colors.text, fontSize: 17, fontWeight: "900", flex: 1, letterSpacing: 0 },
  text: { color: colors.muted, fontWeight: "700" },
  metrics: { flexDirection: "row", gap: 12 },
  section: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0, marginTop: 4 }
});
