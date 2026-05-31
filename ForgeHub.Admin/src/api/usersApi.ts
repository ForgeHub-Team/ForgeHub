import { del, get, post, put } from "./apiClient";
import type { User } from "../types/user";

export const usersApi = {
  getUsers: (params?: Record<string, unknown>) => get<User[]>("/users", params),
  getUsersByRole: (roleId: number) => get<User[]>("/users", { roleId }),
  createUser: (data: Partial<User> & { password?: string; fullName?: string }) => post<User>("/users", data),
  updateUser: (id: number, data: Partial<User>) => put<User>(`/users/${id}`, data),
  activateUser: (user: User) => put<User>(`/users/${user.id}`, { ...user, isActive: true }),
  deactivateUser: (user: User) => put<User>(`/users/${user.id}`, { ...user, isActive: false }),
  deleteUser: (id: number) => del(`/users/${id}`)
};
