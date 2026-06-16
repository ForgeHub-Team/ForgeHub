import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getHomeDashboard } from "@/api/homeApi";
import { getProfile, getProfileDashboard, removeProfilePhoto, uploadProfilePhoto } from "@/api/profileApi";
import { logout } from "@/api/authApi";
import { API_ORIGIN } from "@/config/apiConfig";
import { useAuthStore } from "@/auth/authStore";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { TrainingProgressCard } from "@/components/ui/TrainingProgressCard";
import { WeeklyActivityCard } from "@/components/ui/WeeklyActivityCard";
import { useForgeTheme } from "@/theme/theme";
import { parseApiError } from "@/utils/errors";

export function ProfileScreen() {
  const theme = useForgeTheme();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [pendingPhoto, setPendingPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const homeQuery = useQuery({ queryKey: ["home"], queryFn: getHomeDashboard });
  const dashboardQuery = useQuery({ queryKey: ["profileDashboard"], queryFn: getProfileDashboard });
  const profile = profileQuery.data;
  const dashboard = dashboardQuery.data;
  const dashboardUser = homeQuery.data?.user;
  const membership = homeQuery.data?.membership;
  const persistedPhotoUrl = dashboardUser?.profilePhotoUrl ?? user?.profilePhotoUrl ?? profile?.profilePhotoUrl;
  const photoUri = pendingPhoto?.uri ?? resolvePhotoUrl(persistedPhotoUrl);

  const photoMutation = useMutation({
    mutationFn: uploadProfilePhoto,
    onSuccess: async (response) => {
      setPendingPhoto(null);
      if (user) setUser({ ...user, profilePhotoUrl: response.profilePhotoUrl });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] })
      ]);
    }
  });

  const removeMutation = useMutation({
    mutationFn: removeProfilePhoto,
    onSuccess: async () => {
      setPendingPhoto(null);
      if (user) setUser({ ...user, profilePhotoUrl: null });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] })
      ]);
    }
  });

  const signOut = async () => {
    try { await logout(); } finally { await clearSession(); }
  };

  const pickPhoto = async (source: "camera" | "library") => {
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.82 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.82, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets[0]) {
      setPendingPhoto(result.assets[0]);
    }
  };

  return (
    <ForgeScreen title="Profile" subtitle={user?.fullName ?? "Member profile"} refreshing={profileQuery.isRefetching || homeQuery.isRefetching || dashboardQuery.isRefetching} onRefresh={() => { profileQuery.refetch(); homeQuery.refetch(); dashboardQuery.refetch(); }}>
      {profileQuery.isLoading ? <LoadingState /> : null}
      {profileQuery.error ? <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} /> : null}
      <View style={styles.settingsRow}>
        <View />
        <Pressable onPress={() => router.push("/settings")} style={[styles.settingsButton, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
          <MaterialCommunityIcons name="cog-outline" size={22} color={theme.text} />
        </Pressable>
      </View>
      <View style={styles.identity}>
        <View style={[styles.avatarRing, { borderColor: theme.primary, shadowColor: theme.primary }]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.surface2 }]}>
              <MaterialCommunityIcons name="account" color={theme.primary} size={54} />
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{user?.fullName ?? "ForgeHub Member"}</Text>
        <Text style={[styles.badge, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.surface }]}>
          {membership?.planName || user?.membershipPlan || user?.membershipStatus || "Membership unavailable"}
        </Text>
        <Text style={[styles.meta, { color: theme.muted }]}>Member since {membership?.currentMembership?.startDate ?? "Not available"}</Text>
      </View>

      {pendingPhoto ? <Text style={[styles.previewText, { color: theme.primary }]}>Preview selected. Upload to save it to your account.</Text> : null}
      <View style={styles.photoActions}>
        <ForgeButton title={pendingPhoto ? "Upload" : "Upload"} variant={pendingPhoto ? "primary" : "secondary"} disabled={photoMutation.isPending} onPress={() => pendingPhoto ? photoMutation.mutate(pendingPhoto) : pickPhoto("library")} style={styles.flex} />
        <ForgeButton title="Camera" variant="secondary" disabled={photoMutation.isPending} onPress={() => pickPhoto("camera")} style={styles.flex} />
        <ForgeButton title={pendingPhoto ? "Cancel" : "Remove"} variant="secondary" disabled={(!pendingPhoto && !persistedPhotoUrl) || removeMutation.isPending} onPress={() => pendingPhoto ? setPendingPhoto(null) : removeMutation.mutate()} style={styles.flex} />
      </View>
      {(photoMutation.error || removeMutation.error) ? <Text style={[styles.error, { color: theme.danger }]}>{parseApiError(photoMutation.error ?? removeMutation.error).message}</Text> : null}
      <ForgeButton title="Edit profile" onPress={() => router.push("/profile/edit")} />

      <View style={styles.kpiGrid}>
        <KpiCard icon="dumbbell" label="Total Workouts" value={dashboard?.totalWorkouts ?? 0} badge={formatPercentBadge(dashboard?.workoutsChangePercent)} />
        <KpiCard icon="clock-outline" label="Total Hours" value={dashboard?.totalHours ?? 0} badge={formatPercentBadge(dashboard?.hoursChangePercent)} />
        <KpiCard icon="calendar-check-outline" label="Classes Attended" value={dashboard?.classesAttended ?? 0} badge={formatPercentBadge(dashboard?.classesChangePercent)} />
        <KpiCard icon="card-account-details-star-outline" label="Membership Days" value={dashboard?.membershipRemainingDays ?? membership?.remainingDays ?? user?.remainingDays ?? 0} badge={dashboard?.membershipStatus ?? membership?.status ?? user?.membershipStatus ?? undefined} />
      </View>

      <WeeklyActivityCard activity={dashboard?.weeklyActivity ?? []} averageMinutes={dashboard?.averageTrainingMinutes} />
      {homeQuery.data?.stats ? <TrainingProgressCard stats={homeQuery.data.stats} activity={homeQuery.data.activityHeatmap ?? []} /> : null}

      <ForgeCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Security and settings</Text>
        <Text style={[styles.rowText, { color: theme.muted }]}>{user?.email || "Email unavailable"}</Text>
        <Text style={[styles.rowText, { color: theme.muted }]}>Status: {membership?.status ?? user?.membershipStatus ?? "Unknown"}</Text>
        {dashboardQuery.error ? <Text style={[styles.subtleError, { color: theme.muted }]}>Some profile statistics are temporarily unavailable.</Text> : null}
        <ForgeButton title="Security and settings" variant="secondary" onPress={() => router.push("/settings")} />
        <ForgeButton title="Logout" variant="danger" onPress={signOut} />
      </ForgeCard>
    </ForgeScreen>
  );
}

function KpiCard({ icon, label, value, badge }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; value: string | number; badge?: string | undefined }) {
  const theme = useForgeTheme();
  return (
    <ForgeCard style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <View style={[styles.kpiIcon, { backgroundColor: theme.surface2 }]}>
          <MaterialCommunityIcons name={icon} color={theme.primary} size={22} />
        </View>
        {badge ? <Text style={[styles.kpiBadge, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.surface2 }]}>{badge}</Text> : null}
      </View>
      <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.muted }]}>{label}</Text>
    </ForgeCard>
  );
}

function formatPercentBadge(value?: number | null) {
  if (value === null || value === undefined) return undefined;
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function resolvePhotoUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

const styles = StyleSheet.create({
  settingsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: -12 },
  settingsButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  identity: { alignItems: "center", gap: 10 },
  avatarRing: { width: 132, height: 132, borderRadius: 66, borderWidth: 3, padding: 4, shadowOpacity: 0.26, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  avatar: { width: "100%", height: "100%", borderRadius: 60 },
  avatarFallback: { width: "100%", height: "100%", borderRadius: 60, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 28, fontWeight: "900", letterSpacing: 0, textAlign: "center" },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontWeight: "900", overflow: "hidden" },
  meta: { fontWeight: "700" },
  photoActions: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiCard: { width: "48%", minHeight: 144, gap: 10, padding: 14 },
  kpiTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kpiIcon: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  kpiBadge: { maxWidth: 92, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden", fontSize: 10, fontWeight: "900", textAlign: "center" },
  kpiValue: { fontSize: 30, fontWeight: "900", letterSpacing: 0 },
  kpiLabel: { fontSize: 12, fontWeight: "800", lineHeight: 16 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "900" },
  rowText: { fontWeight: "700", lineHeight: 20 },
  previewText: { fontWeight: "900", textAlign: "center", lineHeight: 20 },
  subtleError: { fontWeight: "700", lineHeight: 20 },
  error: { fontWeight: "800", lineHeight: 20 }
});
