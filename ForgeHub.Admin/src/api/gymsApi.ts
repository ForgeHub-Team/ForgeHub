import { del, get, post, put } from "./apiClient";
import type { Gym } from "../types/gym";

export const gymsApi = {
  getGyms: () => get<Gym[]>("/gyms"),
  getGymById: (id: number) => get<Gym>(`/gyms/${id}`),
  createGym: (data: Partial<Gym>) => post<Gym>("/gyms", data),
  updateGym: (id: number, data: Partial<Gym>) => put<Gym>(`/gyms/${id}`, data),
  activateGym: (id: number) => put<Gym>(`/gyms/${id}`, { isActive: true }),
  deactivateGym: (id: number) => put<Gym>(`/gyms/${id}`, { isActive: false }),
  deleteGym: (id: number) => del(`/gyms/${id}`)
};
