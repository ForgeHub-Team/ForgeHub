import { get } from "./apiClient";

export const reportsApi = {
  getRevenueReport: () => get("/dashboard"),
  getAttendanceReport: () => get("/checkins"),
  getMembershipReport: () => get("/membermemberships"),
  getClassOccupancyReport: () => get("/classbookings"),
  getTrainerActivityReport: () => get("/trainersessions")
};
