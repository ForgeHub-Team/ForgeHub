import { get, post, put } from "./apiClient";
import type { MembershipPlan } from "../types/membership";

export const membershipPlansApi = {
  getPlans: () => get<MembershipPlan[]>("/membershipplans"),
  createPlan: (data: Partial<MembershipPlan>) => post<MembershipPlan>("/membershipplans", data),
  updatePlan: (id: number, data: Partial<MembershipPlan>) => put<MembershipPlan>(`/membershipplans/${id}`, data),
  activatePlan: (plan: MembershipPlan) => put<MembershipPlan>(`/membershipplans/${plan.id}`, { ...plan, isActive: true }),
  deactivatePlan: (plan: MembershipPlan) => put<MembershipPlan>(`/membershipplans/${plan.id}`, { ...plan, isActive: false })
};
