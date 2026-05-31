import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "@/theme/colors";

interface Props extends TextInputProps {
  label: string;
  error?: string | undefined;
}

export const ForgeInput = forwardRef<TextInput, Props>(({ label, error, style, ...props }, ref) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput ref={ref} placeholderTextColor={colors.muted} style={[styles.input, error && styles.inputError, style]} {...props} />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
));

ForgeInput.displayName = "ForgeInput";

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "700", letterSpacing: 0 },
  input: { minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 16, fontSize: 16 },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, fontWeight: "700" }
});
