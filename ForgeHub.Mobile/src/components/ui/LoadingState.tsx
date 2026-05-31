import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function LoadingState({ label = "Loading ForgeHub" }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 32, alignItems: "center", justifyContent: "center", gap: 12 },
  text: { color: colors.muted, fontWeight: "700", letterSpacing: 0 }
});
