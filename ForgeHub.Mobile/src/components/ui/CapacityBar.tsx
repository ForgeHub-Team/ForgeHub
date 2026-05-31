import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function CapacityBar({ percentage }: { percentage: number }) {
  const width = Math.max(0, Math.min(100, percentage));
  const fill = width >= 100 ? colors.danger : width >= 80 ? colors.warning : colors.success;
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${width}%`, backgroundColor: fill }]} />
      </View>
      <Text style={styles.label}>{Math.round(width)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10, alignItems: "center" },
  track: { flex: 1, height: 10, borderRadius: 999, backgroundColor: colors.surface2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  label: { width: 42, textAlign: "right", color: colors.muted, fontSize: 12, fontWeight: "800" }
});
