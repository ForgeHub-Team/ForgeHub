import { StyleSheet, Text, View } from "react-native";
import { ForgeCard } from "./ForgeCard";
import { colors } from "@/theme/colors";

export function MetricCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean | undefined }) {
  return (
    <ForgeCard style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent && styles.accent]}>{value}</Text>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 144, gap: 8 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0 },
  value: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: 0 },
  accent: { color: colors.primary }
});
