import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";

const iconMap = {
  home: "home-variant-outline",
  bookings: "calendar-check-outline",
  "check-in": "qrcode-scan",
  payments: "credit-card-outline",
  profile: "account-circle-outline"
} as const;

export function ForgeBottomTabs() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.warm,
        tabBarStyle: {
          position: "absolute",
          height: 76,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        },
        tabBarIcon: ({ color, size }) => {
          const key = route.name as keyof typeof iconMap;
          return <MaterialCommunityIcons name={iconMap[key]} size={size} color={color} />;
        }
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings" }} />
      <Tabs.Screen name="check-in" options={{ title: "Check In" }} />
      <Tabs.Screen name="payments" options={{ title: "Payments" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="classes" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
    </Tabs>
  );
}
