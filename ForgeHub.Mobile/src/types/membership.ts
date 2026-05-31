export interface MembershipBranchAccess {
  branchId: number;
  branchName: string;
  address?: string;
  openTime?: string;
  closeTime?: string;
  capacity?: number;
  currentOccupancy?: number;
  remainingSpots?: number;
  capacityPercentage?: number;
  status?: string;
  isOpenNow?: boolean;
  canCheckIn?: boolean;
}

export interface MembershipHistoryItem {
  id: number;
  planId?: number | null;
  planName: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  remainingDays: number;
  isActive: boolean;
  freezeDays?: number;
}

export interface CurrentMembership extends MembershipHistoryItem {
  branches: MembershipBranchAccess[];
}

export interface Membership {
  planName: string;
  status: string;
  isActive: boolean;
  remainingDays: number;
  visitsThisMonth: number;
  branchAccess: MembershipBranchAccess[];
  currentMembership: CurrentMembership | null;
  memberships: MembershipHistoryItem[];
}
