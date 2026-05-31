import { z } from "zod";

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().min(0).optional());

const phone = z.string().trim().optional().refine((value) => !value || /^[+\d][+\d\s().-]{6,}$/.test(value), "Enter a valid phone number.");

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or phone."),
  password: z.string().min(1, "Enter your password.")
});

export const profileSchema = z.object({
  heightCm: optionalNumber,
  weightKg: optionalNumber,
  fitnessGoal: z.string().optional(),
  targetWeightKg: optionalNumber,
  bodyFatPercentage: optionalNumber,
  waistCm: optionalNumber,
  chestCm: optionalNumber,
  shoulderCm: optionalNumber,
  hipCm: optionalNumber,
  neckCm: optionalNumber,
  armCm: optionalNumber,
  thighCm: optionalNumber,
  activityLevel: z.string().optional(),
  trainingExperience: z.string().optional(),
  favoriteWorkoutType: z.string().optional(),
  preferredTrainingDays: z.string().optional(),
  preferredWorkoutTime: z.string().optional(),
  bloodType: z.string().optional(),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  injuries: z.string().optional(),
  medications: z.string().optional(),
  doctorClearanceRequired: z.boolean().optional(),
  healthNotes: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: phone,
  emergencyContactAltPhone: phone,
  dailyCaloriesTarget: optionalNumber,
  proteinTargetGrams: optionalNumber,
  carbsTargetGrams: optionalNumber,
  fatTargetGrams: optionalNumber,
  waterTargetMl: optionalNumber,
  language: z.string().optional(),
  theme: z.string().optional(),
  measurementUnit: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  profilePhotoUrl: z.string().optional()
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
