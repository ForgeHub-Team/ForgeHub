import { useEffect, useState } from "react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

const measurementsFields: Array<keyof ProfileFormValues> = [
  "heightCm",
  "weightKg",
  "targetWeightKg",
  "bodyFatPercentage",
  "waistCm",
  "chestCm",
  "shoulderCm",
  "hipCm",
  "neckCm",
  "armCm",
  "thighCm",
  "dailyCaloriesTarget",
  "proteinTargetGrams",
  "carbsTargetGrams",
  "fatTargetGrams",
  "waterTargetMl"
];

const preferencesFields: Array<keyof ProfileFormValues> = [
  "fitnessGoal",
  "activityLevel",
  "trainingExperience",
  "favoriteWorkoutType",
  "preferredTrainingDays",
  "preferredWorkoutTime",
  "language",
  "theme",
  "measurementUnit",
  "profilePhotoUrl"
];

const healthFields: Array<keyof ProfileFormValues> = [
  "bloodType",
  "medicalConditions",
  "allergies",
  "injuries",
  "medications",
  "healthNotes",
  "emergencyContactName",
  "emergencyContactRelationship",
  "emergencyContactPhone",
  "emergencyContactAltPhone"
];

function getFieldLabel(name: string): string {
  const custom: Record<string, string> = {
    heightCm: "Height (cm)",
    weightKg: "Weight (kg)",
    targetWeightKg: "Target Weight (kg)",
    bodyFatPercentage: "Body Fat (%)",
    waistCm: "Waist (cm)",
    chestCm: "Chest (cm)",
    shoulderCm: "Shoulder (cm)",
    hipCm: "Hip (cm)",
    neckCm: "Neck (cm)",
    armCm: "Arm (cm)",
    thighCm: "Thigh (cm)",
    fitnessGoal: "Fitness Goal",
    activityLevel: "Activity Level",
    trainingExperience: "Training Experience",
    favoriteWorkoutType: "Favorite Workout Type",
    preferredTrainingDays: "Preferred Training Days",
    preferredWorkoutTime: "Preferred Workout Time",
    bloodType: "Blood Type",
    medicalConditions: "Medical Conditions",
    allergies: "Allergies",
    injuries: "Injuries",
    medications: "Medications",
    healthNotes: "Health Notes",
    emergencyContactName: "Emergency Contact Name",
    emergencyContactRelationship: "Emergency Contact Relationship",
    emergencyContactPhone: "Emergency Contact Phone",
    emergencyContactAltPhone: "Emergency Contact Alt Phone",
    dailyCaloriesTarget: "Daily Calories Target (kcal)",
    proteinTargetGrams: "Protein Target (g)",
    carbsTargetGrams: "Carbohydrates Target (g)",
    fatTargetGrams: "Fat Target (g)",
    waterTargetMl: "Water Target (ml)",
    language: "Language",
    theme: "Theme",
    measurementUnit: "Measurement Unit",
    profilePhotoUrl: "Profile Photo URL"
  };
  return custom[name] ?? name.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
}
const numericFields: Array<keyof ProfileFormValues> = ["heightCm", "weightKg", "targetWeightKg", "bodyFatPercentage", "waistCm", "chestCm", "shoulderCm", "hipCm", "neckCm", "armCm", "thighCm", "dailyCaloriesTarget", "proteinTargetGrams", "carbsTargetGrams", "fatTargetGrams", "waterTargetMl"];
const textFields: Array<keyof ProfileFormValues> = ["fitnessGoal", "activityLevel", "trainingExperience", "favoriteWorkoutType", "preferredTrainingDays", "preferredWorkoutTime", "bloodType", "medicalConditions", "allergies", "injuries", "medications", "healthNotes", "emergencyContactName", "emergencyContactRelationship", "emergencyContactPhone", "emergencyContactAltPhone", "language", "measurementUnit"];

export function EditProfileScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [activeTab, setActiveTab] = useState<"measurements" | "preferences" | "health">("measurements");

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
    <ForgeScreen title="Edit profile" subtitle="Measurements, goals, health and preferences" scroll={false}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}

      <View style={styles.tabsContainer}>
        {(["measurements", "preferences", "health"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === "measurements" ? "Metrics" : tab === "preferences" ? "Goals" : "Health"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {mutation.error ? <Text style={styles.error}>{parseApiError(mutation.error).message}</Text> : null}
          {mutation.isSuccess ? <Text style={styles.success}>Profile updated successfully.</Text> : null}

          {activeTab === "measurements" && (
            <View style={styles.formSection}>
              {measurementsFields.map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field, fieldState }) => (
                    <ForgeInput
                      label={getFieldLabel(String(name))}
                      keyboardType="decimal-pad"
                      value={field.value === undefined || field.value === null ? "" : String(field.value)}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              ))}
            </View>
          )}

          {activeTab === "preferences" && (
            <View style={styles.formSection}>
              {preferencesFields.map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field, fieldState }) => (
                    <ForgeInput
                      label={getFieldLabel(String(name))}
                      value={(field.value as string | undefined) ?? ""}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              ))}
            </View>
          )}

          {activeTab === "health" && (
            <View style={styles.formSection}>
              {healthFields.map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field, fieldState }) => (
                    <ForgeInput
                      label={getFieldLabel(String(name))}
                      value={(field.value as string | undefined) ?? ""}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                      multiline={["medicalConditions", "allergies", "injuries", "medications", "healthNotes"].includes(String(name))}
                    />
                  )}
                />
              ))}
            </View>
          )}

          <ForgeButton
            title={formState.isSubmitting || mutation.isPending ? "Saving..." : "Save Profile"}
            disabled={mutation.isPending}
            onPress={submit}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 8
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  activeTabButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabText: {
    color: colors.warm,
    fontSize: 14,
    fontWeight: "800"
  },
  activeTabText: {
    color: colors.white
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100
  },
  formSection: {
    gap: 12
  },
  saveButton: {
    marginTop: 10
  },
  error: {
    color: colors.danger,
    fontWeight: "800",
    textAlign: "center"
  },
  success: {
    color: colors.success,
    fontWeight: "900",
    textAlign: "center"
  }
});
