import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { getInsights } from "@/api/insightsApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { colors } from "@/theme/colors";
import { formatNumber } from "@/utils/formatNumber";
import { BodyRatiosCard } from "./BodyRatiosCard";
import { InsightMetricCard } from "./InsightMetricCard";
import { MissingFieldsCard } from "./MissingFieldsCard";

export function InsightsScreen() {
  const query = useQuery({ queryKey: ["insights"], queryFn: getInsights });
  const data = query.data;
  return (
    <ForgeScreen title="Insights" subtitle="Body and nutrition dashboard" refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {data ? (
        <>
          <ForgeCard style={styles.hero}>
            <Text style={styles.label}>BMI</Text>
            <Text style={styles.bmi}>{formatNumber(data.bmi ?? data.bodyMassIndex)}</Text>
            <Text style={styles.category}>{data.bmiCategory ?? "Category unavailable"} · Ideal {data.idealWeightRange ?? "not available"}</Text>
          </ForgeCard>
          <View style={styles.grid}>
            <InsightMetricCard label="Body fat" value={data.bodyFatPercentage} suffix="%" accent />
            <InsightMetricCard label="Lean mass" value={data.leanBodyMassKg} suffix=" kg" />
            <InsightMetricCard label="BMR" value={data.bmr} />
            <InsightMetricCard label="Maintenance" value={data.maintenanceCalories} />
            <InsightMetricCard label="Protein" value={data.proteinTargetGrams} suffix=" g" />
            <InsightMetricCard label="Carbs" value={data.carbsTargetGrams} suffix=" g" />
            <InsightMetricCard label="Fat" value={data.fatTargetGrams} suffix=" g" />
            <InsightMetricCard label="Water" value={data.waterTargetMl} suffix=" ml" />
          </View>
          <BodyRatiosCard insights={data} />
          <MissingFieldsCard fields={data.missingFields} />
        </>
      ) : null}
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6 },
  label: { color: colors.muted, fontWeight: "800" },
  bmi: { color: colors.primary, fontSize: 44, fontWeight: "900", letterSpacing: 0 },
  category: { color: colors.text, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }
});
