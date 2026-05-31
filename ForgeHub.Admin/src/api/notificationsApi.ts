import { get, post, put } from "./apiClient";
import type { CreateNotificationPayload, Notification, NotificationTargets } from "../types/notification";

export const notificationsApi = {
  getNotifications: () => get<Notification[]>("/notifications"),
  getTargets: () => get<NotificationTargets>("/notifications/targets"),
  createNotification: (data: CreateNotificationPayload) => post<Notification>("/notifications", data),
  markAsRead: (id: number, userId: number) => put(`/notifications/${id}/read`, { userId })
};
