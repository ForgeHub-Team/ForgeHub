import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { login } from "@/api/authApi";
import { useAuthStore } from "@/auth/authStore";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { ForgeInput } from "@/components/ui/ForgeInput";
import { colors } from "@/theme/colors";
import { LoginFormValues, loginSchema } from "@/utils/validation";
import { parseApiError } from "@/utils/errors";

export function LoginScreen() {
  const authError = useAuthStore((state) => state.authError);
  const setAuthError = useAuthStore((state) => state.setAuthError);
  const applyLogin = useAuthStore((state) => state.applyLogin);
  const { control, handleSubmit, formState } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" }
  });

  useEffect(() => {
    setAuthError(null);
  }, [setAuthError]);

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(null);
    try {
      const response = await login(values.identifier, values.password);
      await applyLogin(response);
      if (response.role === "Member") router.replace("/tabs/home");
    } catch (error) {
      setAuthError(parseApiError(error).message);
    }
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.brand}>ForgeHub</Text>
        <Text style={styles.title}>Member access</Text>
        <Text style={styles.subtitle}>Sign in to manage check-ins, classes, membership, and body insights.</Text>
      </View>
      <ForgeCard style={styles.card}>
        {authError ? <Text style={styles.error}>{authError}</Text> : null}
        <Controller
          control={control}
          name="identifier"
          render={({ field, fieldState }) => (
            <ForgeInput label="Email or phone" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <ForgeInput label="Password" secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <ForgeButton title={formState.isSubmitting ? "Signing in..." : "Sign in"} onPress={onSubmit} disabled={formState.isSubmitting} />
      </ForgeCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 20, gap: 24 },
  hero: { gap: 8 },
  brand: { color: colors.primary, fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  title: { color: colors.text, fontSize: 34, fontWeight: "900", letterSpacing: 0 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, fontWeight: "600" },
  card: { gap: 16 },
  error: { color: colors.danger, fontWeight: "800", lineHeight: 20 }
});
