import { del, get, patch, post, put } from "./apiClient";
import type { Member, MemberPersonalInfo } from "../types/member";

export const membersApi = {
  getMembers: (params?: Record<string, unknown>) => get<Member[]>("/members", params),
  searchMembers: (query: string) => get<Member[]>("/members", { query }),
  getMemberById: (id: number) => get<Member>(`/members/${id}`),
  createMember: (data: Partial<Member>) => post<Member>("/members", data),
  updateMember: (id: number, data: Partial<Member>) => put<Member>(`/members/${id}`, data),
  getMemberPersonalInfo: (id: number) => get<MemberPersonalInfo>(`/members/${id}/personal-info`),
  updateMemberPersonalInfo: (id: number, data: Partial<MemberPersonalInfo>) => put<MemberPersonalInfo>(`/members/${id}/personal-info`, data),
  activateMember: (member: Member) => patch<Member>(`/members/${member.id}/status`, { isActive: true }),
  deactivateMember: (member: Member) => patch<Member>(`/members/${member.id}/status`, { isActive: false }),
  deleteMember: (id: number) => del(`/members/${id}`)
};
