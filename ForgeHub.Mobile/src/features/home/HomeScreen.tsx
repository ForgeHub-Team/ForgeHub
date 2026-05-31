import { useQuery } from "@tanstack/react-query";
import { ActivityHeatmapDay, DashboardStats, getHomeDashboard } from "@/api/homeApi";
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
  const stats = data?.stats;

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
      {stats && hasProgressStats(stats) ? (
        <>
          <SectionTitle title="Progress" />
          <ProgressHeatmap
            stats={stats}
            activity={data?.activityHeatmap ?? []}
          />
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

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

function ProgressHeatmap({
  stats,
  activity
}: {
  stats: DashboardStats;
  activity: ActivityHeatmapDay[];
}) {
  const days = normalizeHeatmapDays(activity);
  const weeks = Array.from({ length: 12 }, (_, weekIndex) => days.slice(weekIndex * 7, weekIndex * 7 + 7));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const hasActivity = total > 0;
  const mostActive = getMostActiveDay(days);

  return (
    <View style={styles.heatmapCard}>
      <View style={styles.heatmapHeader}>
        <View>
          <Text style={styles.heatmapEyebrow}>Training Activity</Text>
          <Text style={styles.heatmapTitle}>Last 12 weeks</Text>
          <Text style={styles.heatmapSubtitle}>Your check-ins over recent days</Text>
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          {[0, 1, 2, 3].map((level) => <View key={level} style={[styles.legendDot, heatLevel(level)]} />)}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>

      <View style={styles.calendarWrap}>
        <View style={styles.weekdayColumn}>
          {weekdayLabels.map((label, index) => <Text key={`${label}-${index}`} style={styles.weekdayText}>{label}</Text>)}
        </View>
        <View style={styles.weekGrid}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekColumn}>
              {week.map((day) => (
                <View key={day.date} style={[styles.heatmapCell, heatLevel(day.count)]} />
              ))}
            </View>
          ))}
        </View>
      </View>

      {!hasActivity ? <Text style={styles.emptyHeatmapText}>Start checking in to build your training streak.</Text> : null}

      <View style={styles.progressStatsRow}>
        <MiniStat label="This month" value={stats.visitsThisMonth ?? 0} />
        <MiniStat label="Streak" value={`${stats.currentStreak ?? 0}d`} />
        <MiniStat label="Top day" value={mostActive} />
      </View>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function normalizeHeatmapDays(activity: ActivityHeatmapDay[]) {
  const map = new Map(activity.map((day) => [day.date, day.count]));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 83);
  return Array.from({ length: 84 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    return { date: key, count: map.get(key) ?? 0 };
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMostActiveDay(days: Array<{ date: string; count: number }>) {
  const best = days.reduce((current, day) => day.count > current.count ? day : current, { date: "", count: 0 });
  if (best.count <= 0) return "-";
  return new Date(`${best.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

function heatLevel(count: number) {
  if (count <= 0) return styles.heat0;
  if (count === 1) return styles.heat1;
  if (count === 2) return styles.heat2;
  return styles.heat3;
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
  heatmapCard: { borderRadius: 8, borderWidth: 1, borderColor: "rgba(252,106,10,0.35)", backgroundColor: "#332F2C", padding: 14, gap: 12 },
  heatmapHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heatmapEyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0 },
  heatmapTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 3, letterSpacing: 0 },
  heatmapSubtitle: { color: "rgba(245,236,228,0.72)", fontSize: 12, fontWeight: "700", marginTop: 2 },
  legend: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { color: "rgba(245,236,228,0.72)", fontSize: 10, fontWeight: "800" },
  legendDot: { width: 11, height: 11, borderRadius: 4, borderWidth: 1 },
  calendarWrap: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  weekdayColumn: { gap: 5, paddingTop: 1 },
  weekdayText: { height: 14, color: "rgba(245,236,228,0.72)", fontSize: 9, fontWeight: "900", textAlign: "center" },
  weekGrid: { flex: 1, flexDirection: "row", justifyContent: "space-between", gap: 4 },
  weekColumn: { flex: 1, gap: 5 },
  heatmapCell: { width: "100%", aspectRatio: 1, borderRadius: 4, borderWidth: 1 },
  heat0: { backgroundColor: "rgba(252,106,10,0.08)", borderColor: "rgba(252,106,10,0.12)" },
  heat1: { backgroundColor: "rgba(252,106,10,0.35)", borderColor: "rgba(252,106,10,0.48)" },
  heat2: { backgroundColor: "rgba(252,106,10,0.68)", borderColor: "rgba(252,106,10,0.82)" },
  heat3: { backgroundColor: colors.primary, borderColor: "#FFB067" },
  emptyHeatmapText: { color: colors.warm, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  progressStatsRow: { flexDirection: "row", gap: 8 },
  miniStat: { flex: 1, borderRadius: 8, backgroundColor: "rgba(2,6,23,0.18)", borderWidth: 1, borderColor: "rgba(245,236,228,0.12)", padding: 10, gap: 2 },
  miniStatValue: { color: colors.text, fontSize: 17, fontWeight: "900", letterSpacing: 0 },
  miniStatLabel: { color: colors.warm, fontSize: 10, fontWeight: "800" }
});
