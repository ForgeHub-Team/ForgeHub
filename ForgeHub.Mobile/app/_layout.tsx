import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { useAuthGuard } from "@/auth/useAuthGuard";
import { LoadingState } from "@/components/ui/LoadingState";
import { useActiveCheckInLocationWatcher } from "@/features/qr/useActiveCheckInLocationWatcher";
import { colors } from "@/theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

function RootNavigator() {
  const checkingAuth = useAuthGuard();
  useActiveCheckInLocationWatcher();

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="qr-scan" />
        <Stack.Screen name="active-checkin" />
        <Stack.Screen name="membership" />
        <Stack.Screen name="branches" />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="classes/[id]" />
      </Stack>
      {checkingAuth ? (
        <View style={styles.loadingOverlay}>
          <SafeAreaView style={styles.loadingSafeArea}>
            <LoadingState label="Checking session" />
          </SafeAreaView>
        </View>
      ) : null}
    </>
  );
}

export default function Layout() {
  const client = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000
      }
    }
  }), []);
  return (
    <QueryClientProvider client={client}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 20
  },
  loadingSafeArea: {
    flex: 1,
    justifyContent: "center"
  }
});
