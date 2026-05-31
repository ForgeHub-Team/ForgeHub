import { get, post } from "./apiClient";
import type { CheckIn } from "../types/checkIn";

export const checkInsApi = {
  getTodayAttendance: () => get<CheckIn[]>("/checkins"),
  getActiveCheckIns: () => get<CheckIn[]>("/checkins"),
  getCheckInHistory: () => get<CheckIn[]>("/checkins"),
  manualCheckIn: (memberId: number, branchId?: number | null) => post("/checkins", { memberId, branchId, method: "STAFF_MANUAL" }),
  manualCheckOut: (id: number) => post(`/checkins/${id}/manual-checkout`)
  // TODO backend: POST /api/checkins/{id}/manual-checkout is not available yet.
};
