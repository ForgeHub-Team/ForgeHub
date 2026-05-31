import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/theme/colors";

export function ForgeHeader({ title, subtitle, showNotifications = true }: { title: string; subtitle?: string | undefined; showNotifications?: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <Text style={styles.brand}>ForgeHub</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showNotifications ? (
        <Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  titleBlock: { flex: 1, paddingRight: 12 },
  brand: { color: colors.primary, fontWeight: "900", fontSize: 13, letterSpacing: 0 },
  title: { color: colors.text, fontWeight: "900", fontSize: 26, letterSpacing: 0 },
  subtitle: { color: colors.muted, fontWeight: "700", fontSize: 13, marginTop: 2 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
});
