export const endpoints = {
  auth: {
    login: "/Auth/member/login",
    refresh: "/Auth/refresh",
    logout: "/Auth/logout",
    me: "/Auth/me"
  },
  home: {
    profile: "/member-profile",
    membership: "/Membership",
    stats: "/Stats",
    activityHeatmap: "/mobile/me/activity-heatmap",
    bookings: "/member/bookings",
    notifications: "/Notifications/me"
  },
  membership: "/Membership",
  branchAccess: "/member/branches/access",
  qrScan: "/Qr/scan",
  activeCheckIn: "/CheckIns/active",
  currentGymSession: "/mobile/check-ins/current",
  lastGymSession: "/mobile/check-ins/last",
  checkout: "/CheckIns/checkout",
  mobileCheckout: "/mobile/check-ins/check-out",
  heartbeat: "/mobile/check-ins/heartbeat",
  autoCheckout: "/CheckIns/auto-checkout",
  locationUpdate: "/Location/update",
  classes: "/member/classes",
  bookings: "/member/bookings",
  bookClass: (classId: number) => `/member/classes/${classId}/book`,
  cancelBooking: (bookingId: number) => `/member/bookings/${bookingId}/cancel`,
  cancelClassBooking: (classId: number) => `/member/classes/${classId}/cancel`,
  notifications: "/Notifications/me",
  readNotification: (id: number) => `/Notifications/${id}/read`,
  profile: "/member-profile",
  insights: "/member-profile/insights",
  history: "/CheckIns",
  payments: "/member/payments"
} as const;
