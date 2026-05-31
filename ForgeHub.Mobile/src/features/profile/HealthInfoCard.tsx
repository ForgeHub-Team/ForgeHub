import { StyleSheet, Text } from "react-native";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { colors } from "@/theme/colors";
import { MemberProfile } from "@/types/profile";

export function HealthInfoCard({ profile }: { profile: MemberProfile }) {
  return (
    <ForgeCard style={styles.card}>
      <Text style={styles.title}>Health info</Text>
      <Text style={styles.text}>Kept inside profile and not shown on the home dashboard.</Text>
      <Text style={styles.value}>Blood type: {profile.bloodType || "Not set"}</Text>
      <Text style={styles.text}>Doctor clearance: {profile.doctorClearanceRequired ? "Required" : "Not required"}</Text>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  text: { color: colors.muted, lineHeight: 20, fontWeight: "600" },
  value: { color: colors.text, fontWeight: "900" }
});
