import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0 }
});
