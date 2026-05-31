import { Text } from "react-native";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { colors } from "@/theme/colors";
import { apiBaseUrl } from "@/api/apiClient";

export function SettingsScreen() {
  return (
    <ForgeScreen title="Settings" subtitle="App configuration">
      <ForgeCard>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>Backend API</Text>
        <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>{apiBaseUrl}</Text>
      </ForgeCard>
    </ForgeScreen>
  );
}
