import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 28, alignItems: "center", gap: 8 },
  title: { color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "center", letterSpacing: 0 },
  message: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }
});
