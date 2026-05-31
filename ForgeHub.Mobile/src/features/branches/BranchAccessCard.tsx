import { StyleSheet, Text, View } from "react-native";
import { BranchAccess } from "@/types/branch";
import { CapacityBar } from "@/components/ui/CapacityBar";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { colors } from "@/theme/colors";

export function BranchAccessCard({ branch }: { branch: BranchAccess }) {
  return (
    <ForgeCard style={styles.card}>
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          <Text style={styles.name}>{branch.branchName}</Text>
          <Text style={styles.address}>{branch.address}</Text>
        </View>
        <StatusBadge label={branch.status} tone={toneForStatus(branch.status)} />
      </View>
      <Text style={styles.hours}>{branch.openTime || "--"} - {branch.closeTime || "--"}</Text>
      <CapacityBar percentage={branch.capacityPercentage} />
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{branch.currentOccupancy}/{branch.capacity} inside</Text>
        <Text style={styles.meta}>{branch.remainingSpots} spots left</Text>
      </View>
      <View style={styles.flags}>
        <Text style={[styles.flag, branch.canCheckIn ? styles.ok : styles.warn]}>{branch.canCheckIn ? "Check-in available" : "Check-in unavailable"}</Text>
        <Text style={[styles.flag, branch.membershipAccess ? styles.ok : styles.warn]}>{branch.membershipAccess ? "Included" : "Not included"}</Text>
      </View>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  top: { flexDirection: "row", gap: 12, alignItems: "flex-start", justifyContent: "space-between" },
  titleBlock: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  address: { color: colors.muted, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  hours: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  meta: { color: colors.text, fontWeight: "800", fontSize: 13 },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flag: { fontSize: 12, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden" },
  ok: { color: colors.success, backgroundColor: "rgba(34,197,94,0.12)" },
  warn: { color: colors.warning, backgroundColor: "rgba(245,158,11,0.12)" }
});
