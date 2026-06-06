import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileText,
  Home,
  ListChecks,
  Search,
  Settings,
  Shield,
  UserPlus,
  Users
} from "lucide-react";
import type { Role } from "../types/auth";

export interface MenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const menuByRole: Record<Role, MenuItem[]> = {
  SuperAdmin: [
    { label: "Dashboard", path: "/superadmin/dashboard", icon: Home },
    { label: "Gyms", path: "/superadmin/gyms", icon: Building2 },
    { label: "Gym Owners", path: "/superadmin/gym-owners", icon: Shield },
    { label: "Platform Users", path: "/superadmin/platform-users", icon: Users },
    { label: "QR Codes", path: "/superadmin/branch-qr", icon: FileText },
    { label: "Reports", path: "/superadmin/reports", icon: BarChart3 },
    { label: "Audit Logs", path: "/superadmin/audit-logs", icon: FileText },
    { label: "Settings", path: "/settings", icon: Settings }
  ],
  GymOwner: [
    { label: "Dashboard", path: "/gym-owner/dashboard", icon: Home },
    { label: "Branches", path: "/gym-owner/branches", icon: Building2 },
    { label: "QR Codes", path: "/gym-owner/branch-qr", icon: FileText },
    { label: "Members", path: "/gym-owner/members", icon: Users },
    { label: "Membership Plans", path: "/gym-owner/membership-plans", icon: Shield },
    { label: "Payments", path: "/gym-owner/payments", icon: CreditCard },
    { label: "Classes", path: "/gym-owner/classes", icon: CalendarDays },
    { label: "Team", path: "/gym-owner/staff", icon: Users },
    { label: "Notifications", path: "/gym-owner/notifications", icon: Bell },
    { label: "Reports", path: "/gym-owner/reports", icon: BarChart3 },
    { label: "Settings", path: "/settings", icon: Settings }
  ],
  BranchManager: [
    { label: "Dashboard", path: "/branch-manager/dashboard", icon: Home },
    { label: "Members", path: "/branch-manager/members", icon: Users },
    { label: "Check-ins", path: "/branch-manager/check-ins", icon: Activity },
    { label: "Branch QR", path: "/branch-manager/branch-qr", icon: FileText },
    { label: "Classes", path: "/branch-manager/classes", icon: CalendarDays },
    { label: "Team", path: "/branch-manager/staff", icon: Users },
    { label: "Payments", path: "/branch-manager/payments", icon: CreditCard },
    { label: "Notifications", path: "/branch-manager/notifications", icon: Bell },
    { label: "Reports", path: "/branch-manager/reports", icon: BarChart3 }
  ],
  Staff: [
    { label: "Dashboard", path: "/staff/dashboard", icon: Home },
    { label: "Member Search", path: "/staff/member-search", icon: Search },
    { label: "Register Member", path: "/staff/register-member", icon: UserPlus },
    { label: "Renew Membership", path: "/staff/renew-membership", icon: Shield },
    { label: "Payments", path: "/staff/payments", icon: CreditCard },
    { label: "Check-in / Check-out", path: "/staff/manual-check-in", icon: ListChecks },
    { label: "Branch QR", path: "/staff/branch-qr", icon: FileText },
    { label: "Today Attendance", path: "/staff/today-attendance", icon: Activity }
  ],
  Trainer: [
    { label: "Dashboard", path: "/trainer/dashboard", icon: Home },
    { label: "Schedule", path: "/trainer/today", icon: Activity },
    { label: "My Classes", path: "/trainer/classes", icon: CalendarDays },
    { label: "My Members", path: "/trainer/members", icon: Users },
    { label: "Sessions", path: "/trainer/sessions", icon: Dumbbell },
    { label: "Notes", path: "/trainer/notes", icon: FileText },
    { label: "Profile", path: "/trainer/profile", icon: Settings }
  ],
  Member: []
};
