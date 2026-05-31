import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { colors } from "@/theme/colors";

export function MissingFieldsCard({ fields }: { fields: string[] }) {
  if (!fields.length) return null;
  return (
    <ForgeCard style={styles.card}>
      <Text style={styles.title}>Complete profile to improve insights</Text>
      <Text style={styles.text}>{fields.join(", ")}</Text>
      <ForgeButton title="Update profile" variant="secondary" onPress={() => router.push("/tabs/profile")} />
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { color: colors.text, fontSize: 17, fontWeight: "900", letterSpacing: 0 },
  text: { color: colors.muted, lineHeight: 20, fontWeight: "700" }
});
