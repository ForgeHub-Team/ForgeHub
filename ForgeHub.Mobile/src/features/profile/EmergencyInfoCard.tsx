import { StyleSheet, Text } from "react-native";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { colors } from "@/theme/colors";
import { MemberProfile } from "@/types/profile";

export function EmergencyInfoCard({ profile }: { profile: MemberProfile }) {
  return (
    <ForgeCard style={styles.card}>
      <Text style={styles.title}>Emergency contact</Text>
      <Text style={styles.text}>Emergency and health info helps staff respond safely.</Text>
      <Text style={styles.value}>{profile.emergencyContactName || "No emergency contact"}</Text>
      <Text style={styles.text}>{profile.emergencyContactRelationship || "Relationship not set"} · {profile.emergencyContactPhone || "Phone not set"}</Text>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  text: { color: colors.muted, lineHeight: 20, fontWeight: "600" },
  value: { color: colors.text, fontSize: 16, fontWeight: "900" }
});
