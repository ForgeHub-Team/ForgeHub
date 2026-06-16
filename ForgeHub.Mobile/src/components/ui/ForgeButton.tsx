import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useForgeTheme } from "@/theme/theme";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: ViewStyle;
}

export function ForgeButton({ title, onPress, variant = "primary", disabled, style }: Props) {
  const theme = useForgeTheme();
  const label = <Text style={[styles.text, variant !== "primary" && { color: theme.text }]}>{title}</Text>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant !== "primary" && {
          backgroundColor: variant === "danger" ? theme.danger : theme.surface2,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: theme.border
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={[theme.primary, theme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {label}
        </LinearGradient>
      ) : label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  gradient: { minHeight: 52, alignSelf: "stretch", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  text: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", letterSpacing: 0 }
});
