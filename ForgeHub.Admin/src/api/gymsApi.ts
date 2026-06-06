import { del, get, post, postForm, put } from "./apiClient";
import type { Gym } from "../types/gym";

export const gymsApi = {
  getGyms: () => get<Gym[]>("/gyms"),
  getGymById: (id: number) => get<Gym>(`/gyms/${id}`),
  createGym: (data: Partial<Gym>) => post<Gym>("/gyms", data),
  updateGym: (id: number, data: Partial<Gym>) => put<Gym>(`/gyms/${id}`, data),
  activateGym: (gym: Gym) => put<Gym>(`/gyms/${gym.id}`, { name: gym.name, city: gym.city, ownerUserId: gym.ownerUserId, logoUrl: gym.logoUrl, isActive: true }),
  deactivateGym: (gym: Gym) => put<Gym>(`/gyms/${gym.id}`, { name: gym.name, city: gym.city, ownerUserId: gym.ownerUserId, logoUrl: gym.logoUrl, isActive: false }),
  uploadLogo: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return postForm<{ logoUrl: string }>("/gyms/logo", data);
  },
  deleteGym: (id: number) => del(`/gyms/${id}`)
};
