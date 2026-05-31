import { StyleSheet, Text, View } from "react-native";
import { ForgeButton } from "./ForgeButton";
import { colors } from "@/theme/colors";
import { parseApiError } from "@/utils/errors";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Something needs attention</Text>
      <Text style={styles.text}>{parseApiError(error).message}</Text>
      {onRetry ? <ForgeButton title="Retry" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 24, gap: 14, alignItems: "stretch" },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", letterSpacing: 0 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 20 }
});
