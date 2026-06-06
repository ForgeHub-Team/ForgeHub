import { get } from "./apiClient";

export interface HourlyBranchCapacity {
  hour: number;
  label: string;
  activePeopleCount: number;
  branchCapacity?: number | null;
  utilizationPercent?: number | null;
}

export interface CheckInOutSummary {
  checkIns: number;
  manualCheckOuts: number;
  autoCheckOuts: number;
}

export interface CheckInUnderlyingRow {
  id: number;
  memberId?: number | null;
  memberName: string;
  branchName: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  isAutoCheckOut: boolean;
  status: string;
}

export interface ManagerReport {
  branchId: number;
  branchName: string;
  branchCapacity?: number | null;
  totalMembersLoggedToday: number;
  branchCapacityByHour: HourlyBranchCapacity[];
  checkInOutSummary: CheckInOutSummary;
  todayCheckIns: CheckInUnderlyingRow[];
}

export const reportsApi = {
  getManagerReport: () => get<ManagerReport>("/reports/manager"),
  getRevenueReport: () => get("/dashboard"),
  getAttendanceReport: () => get("/checkins"),
  getMembershipReport: () => get("/membermemberships"),
  getClassOccupancyReport: () => get("/classbookings"),
  getTrainerActivityReport: () => get("/trainersessions")
};
