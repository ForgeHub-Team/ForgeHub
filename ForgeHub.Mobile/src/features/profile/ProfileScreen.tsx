import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { getProfile } from "@/api/profileApi";
import { logout } from "@/api/authApi";
import { useAuthStore } from "@/auth/authStore";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { MetricCard } from "@/components/ui/MetricCard";
import { colors } from "@/theme/colors";
import { EmergencyInfoCard } from "./EmergencyInfoCard";
import { HealthInfoCard } from "./HealthInfoCard";

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const query = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const profile = query.data;
  const signOut = async () => {
    try { await logout(); } finally { await clearSession(); }
  };
  return (
    <ForgeScreen title="Profile" subtitle={user?.fullName ?? "Member profile"} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      <ForgeCard style={styles.identity}>
        <Text style={styles.name}>{user?.fullName ?? "ForgeHub Member"}</Text>
        <Text style={styles.meta}>{user?.email ?? "Email unavailable"}</Text>
        <Text style={styles.meta}>Membership: {user?.membershipStatus ?? "Unknown"}</Text>
      </ForgeCard>
      {profile ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="Completion" value={Math.round(profile.profileCompletionPercentage ?? 0) + "%"} accent />
            <MetricCard label="Goal" value={profile.fitnessGoal || "Not set"} />
          </View>
          <EmergencyInfoCard profile={profile} />
          <HealthInfoCard profile={profile} />
        </>
      ) : null}
      <ForgeButton title="Edit profile" onPress={() => router.push("/profile/edit")} />
      <ForgeButton title="Settings" variant="secondary" onPress={() => router.push("/settings")} />
      <ForgeButton title="Logout" variant="danger" onPress={signOut} />
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  identity: { gap: 6 },
  name: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: 0 },
  meta: { color: colors.muted, fontWeight: "700" },
  metrics: { flexDirection: "row", gap: 12 }
});
