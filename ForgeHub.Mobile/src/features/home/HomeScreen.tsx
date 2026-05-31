import { useQuery } from "@tanstack/react-query";
import { DashboardStats, getHomeDashboard } from "@/api/homeApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { colors } from "@/theme/colors";
import { StyleSheet, Text, View } from "react-native";
import { MembershipSummaryCard } from "./components/MembershipSummaryCard";
import { CheckInStatusCard } from "./components/CheckInStatusCard";
import { QuickActionsGrid } from "./components/QuickActionsGrid";
import { TodayClassesPreview } from "./components/TodayClassesPreview";

export function HomeScreen() {
  const query = useQuery({ queryKey: ["home"], queryFn: getHomeDashboard });
  const data = query.data;
  const firstName = data?.user?.fullName?.split(" ")[0] ?? "Member";
  const homeBranchName = data?.user?.branchName ?? data?.membership?.currentMembership?.branches?.[0]?.branchName ?? data?.membership?.branchAccess?.[0]?.branchName ?? "Home branch";
  const status = data?.membership?.status ?? data?.user?.membershipStatus ?? "No Membership";
  const remainingDays = data?.membership?.remainingDays ?? data?.user?.remainingDays ?? 0;

  return (
    <ForgeScreen title={`Hi, ${firstName}`} subtitle={homeBranchName} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {data?.warnings.length ? <Text style={styles.warning}>Some dashboard sections could not load: {data.warnings.join(", ")}</Text> : null}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.eyebrow}>Membership</Text>
            <Text style={styles.heroName}>{data?.user?.fullName ?? "ForgeHub Member"}</Text>
          </View>
          <Text style={[styles.statusPill, statusTone(status)]}>{displayStatus(status)}</Text>
        </View>
        <Text style={styles.heroMeta}>{remainingDays > 0 ? `${remainingDays} days remaining` : "No remaining membership days"}</Text>
      </View>
      <MembershipSummaryCard membership={data?.membership ?? null} homeBranchName={homeBranchName} />
      <CheckInStatusCard session={data?.currentGymSession ?? null} />
      <SectionTitle title="Quick actions" />
      <QuickActionsGrid hasActiveSession={Boolean(data?.currentGymSession?.hasActiveCheckIn)} />
      <SectionTitle title="Classes" />
      <TodayClassesPreview classes={data?.classes ?? []} />
      {hasProgressStats(data?.stats) ? (
        <>
          <SectionTitle title="Progress" />
          <View style={styles.progressGrid}>
            <ProgressStat label="This week" value={data?.stats.visitsThisWeek ?? 0} />
            <ProgressStat label="This month" value={data?.stats.visitsThisMonth ?? data?.membership?.visitsThisMonth ?? 0} />
            <ProgressStat label="Streak" value={`${data?.stats.currentStreak ?? 0} days`} />
            <ProgressStat label="Avg time" value={`${data?.stats.averageGymTimeMinutes ?? 0} min`} />
          </View>
        </>
      ) : null}
    </ForgeScreen>
  );
}

function displayStatus(status: string) {
  const normalized = status.trim();
  if (!normalized || normalized === "Pending") return "No Membership";
  return normalized.replace(/_/g, " ");
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("active")) return styles.statusActive;
  if (normalized.includes("frozen")) return styles.statusFrozen;
  if (normalized.includes("expired") || normalized.includes("cancel")) return styles.statusDanger;
  return styles.statusNeutral;
}

function hasProgressStats(stats: DashboardStats | undefined) {
  return Boolean(stats && (
    stats.visitsThisWeek !== undefined ||
    stats.visitsThisMonth !== undefined ||
    stats.currentStreak !== undefined ||
    stats.averageGymTimeMinutes !== undefined
  ));
}

function ProgressStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.progressItem}>
      <Text style={styles.progressValue}>{value}</Text>
      <Text style={styles.progressLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warning: { color: colors.warning, backgroundColor: "rgba(245,158,11,0.12)", padding: 12, borderRadius: 8, fontWeight: "800", lineHeight: 19 },
  hero: { gap: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, borderRadius: 8, padding: 18 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  eyebrow: { color: colors.warm, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0 },
  heroName: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 4, letterSpacing: 0 },
  heroMeta: { color: colors.warm, fontSize: 14, fontWeight: "800" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, overflow: "hidden", fontSize: 12, fontWeight: "900", maxWidth: 140, textAlign: "center" },
  statusActive: { color: colors.background, backgroundColor: colors.warm },
  statusFrozen: { color: colors.background, backgroundColor: "#FBBF24" },
  statusDanger: { color: colors.white, backgroundColor: colors.danger },
  statusNeutral: { color: colors.warm, backgroundColor: colors.secondary },
  progressGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  progressItem: { width: "48%", borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, padding: 14, gap: 4 },
  progressValue: { color: colors.text, fontSize: 20, fontWeight: "900", letterSpacing: 0 },
  progressLabel: { color: colors.warm, fontSize: 12, fontWeight: "800" }
});
