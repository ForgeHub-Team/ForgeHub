import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "neutral" }) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function toneForStatus(status?: string) {
  const value = status?.toLowerCase() ?? "";
  if (value.includes("available") || value.includes("active") || value.includes("open")) return "success" as const;
  if (value.includes("almost") || value.includes("pending")) return "warning" as const;
  if (value.includes("full") || value.includes("closed") || value.includes("inactive")) return "danger" as const;
  return "neutral" as const;
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  success: { backgroundColor: "rgba(34,197,94,0.16)" },
  warning: { backgroundColor: "rgba(245,158,11,0.16)" },
  danger: { backgroundColor: "rgba(239,68,68,0.16)" },
  neutral: { backgroundColor: colors.surface2 },
  text: { color: colors.text, fontSize: 12, fontWeight: "800", letterSpacing: 0 }
});
