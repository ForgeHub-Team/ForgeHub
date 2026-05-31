import { useEffect } from "react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { getProfile, updateProfile } from "@/api/profileApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeInput } from "@/components/ui/ForgeInput";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors } from "@/theme/colors";
import { MemberProfile } from "@/types/profile";
import { profileSchema, ProfileFormValues } from "@/utils/validation";
import { parseApiError } from "@/utils/errors";

const numericFields: Array<keyof ProfileFormValues> = ["heightCm", "weightKg", "targetWeightKg", "bodyFatPercentage", "waistCm", "chestCm", "shoulderCm", "hipCm", "neckCm", "armCm", "thighCm", "dailyCaloriesTarget", "proteinTargetGrams", "carbsTargetGrams", "fatTargetGrams", "waterTargetMl"];
const textFields: Array<keyof ProfileFormValues> = ["fitnessGoal", "activityLevel", "trainingExperience", "favoriteWorkoutType", "preferredTrainingDays", "preferredWorkoutTime", "bloodType", "medicalConditions", "allergies", "injuries", "medications", "healthNotes", "emergencyContactName", "emergencyContactRelationship", "emergencyContactPhone", "emergencyContactAltPhone", "language", "theme", "measurementUnit", "profilePhotoUrl"];

export function EditProfileScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { control, handleSubmit, reset, formState } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as unknown as Resolver<ProfileFormValues>
  });

  useEffect(() => {
    if (query.data) {
      reset(query.data as ProfileFormValues);
    }
  }, [query.data, reset]);
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      reset(profile as ProfileFormValues);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
    }
  });
  const submit = handleSubmit((values) => mutation.mutate(values as unknown as MemberProfile));

  return (
    <ForgeScreen title="Edit profile" subtitle="Measurements, goals, health and preferences">
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {mutation.error ? <Text style={styles.error}>{parseApiError(mutation.error).message}</Text> : null}
      {mutation.isSuccess ? <Text style={styles.success}>Profile updated.</Text> : null}
      <Text style={styles.section}>Body measurements and targets</Text>
      <View style={styles.grid}>
        {numericFields.map((name) => (
          <Controller key={name} control={control} name={name} render={({ field, fieldState }) => (
            <ForgeInput label={String(name)} keyboardType="decimal-pad" value={field.value === undefined || field.value === null ? "" : String(field.value)} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
        ))}
      </View>
      <Text style={styles.section}>Goals, health, emergency and preferences</Text>
      {textFields.map((name) => (
        <Controller key={name} control={control} name={name} render={({ field, fieldState }) => (
          <ForgeInput label={String(name)} value={(field.value as string | undefined) ?? ""} onChangeText={field.onChange} error={fieldState.error?.message} multiline={["medicalConditions", "allergies", "injuries", "medications", "healthNotes"].includes(String(name))} />
        )} />
      ))}
      <ForgeButton title={formState.isSubmitting || mutation.isPending ? "Saving..." : "Save profile"} disabled={mutation.isPending} onPress={submit} />
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  section: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0, marginTop: 4 },
  error: { color: colors.danger, fontWeight: "800" },
  success: { color: colors.success, fontWeight: "900" }
});
