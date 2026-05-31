import { getMe } from "./authApi";
import { getCurrentGymSession } from "./checkInApi";
import { getBookings, getClasses } from "./classesApi";
import { getMembership } from "./membershipApi";
import { getNotifications } from "./notificationsApi";
import { getProfile } from "./profileApi";
import { getJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { AuthUser } from "@/types/auth";
import { Booking, GymClass } from "@/types/class";
import { CurrentGymSession } from "@/types/checkIn";
import { Membership } from "@/types/membership";
import { NotificationItem } from "@/types/notification";
import { MemberProfile } from "@/types/profile";

export interface DashboardStats {
  weeklyAttendance: number[];
  monthlyAttendance: number[];
  workoutFrequency: number;
  totalCheckIns: number;
  caloriesBurnedEstimate: number;
  visitsThisWeek?: number;
  visitsThisMonth?: number;
  currentStreak?: number;
  averageGymTimeMinutes?: number;
}

export interface HomeDashboard {
  user: AuthUser | null;
  profile: MemberProfile | null;
  membership: Membership | null;
  stats: DashboardStats;
  bookings: Booking[];
  classes: GymClass[];
  currentGymSession: CurrentGymSession | null;
  notifications: NotificationItem[];
  warnings: string[];
}

export async function getHomeDashboard(): Promise<HomeDashboard> {
  const settled = await Promise.allSettled([
    getMe(),
    getProfile(),
    getMembership(),
    getJson<DashboardStats>(endpoints.home.stats),
    getBookings(),
    getClasses(),
    getCurrentGymSession(),
    getNotifications()
  ]);

  const warnings = settled
    .map((item, index) => ({ item, label: ["user", "profile", "membership", "stats", "bookings", "classes", "gym session", "notifications"][index] }))
    .filter((entry) => entry.item.status === "rejected")
    .map((entry) => entry.label ?? "endpoint");

  const value = <T>(index: number, fallback: T): T => {
    const item = settled[index];
    return item?.status === "fulfilled" ? (item.value as T) : fallback;
  };

  return {
    user: value<AuthUser | null>(0, null),
    profile: value<MemberProfile | null>(1, null),
    membership: value<Membership | null>(2, null),
    stats: value(3, { weeklyAttendance: [], monthlyAttendance: [], workoutFrequency: 0, totalCheckIns: 0, caloriesBurnedEstimate: 0 }),
    bookings: value<Booking[]>(4, []),
    classes: value<GymClass[]>(5, []),
    currentGymSession: value<CurrentGymSession | null>(6, null),
    notifications: value<NotificationItem[]>(7, []),
    warnings
  };
}
