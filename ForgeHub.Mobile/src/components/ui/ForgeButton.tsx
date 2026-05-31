import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: ViewStyle;
}

export function ForgeButton({ title, onPress, variant = "primary", disabled, style }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.base, styles[variant], disabled && styles.disabled, pressed && !disabled && styles.pressed, style]}>
      <Text style={[styles.text, variant !== "primary" && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  text: { color: colors.white, fontSize: 15, fontWeight: "800", letterSpacing: 0 },
  secondaryText: { color: colors.text }
});
