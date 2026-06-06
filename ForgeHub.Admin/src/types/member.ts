export interface Member {
  id: number;
  gymId?: number | null;
  branchId?: number | null;
  homeBranchId?: number | null;
  branchName?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  planId?: string;
  trainerId?: number | null;
  trainerName?: string;
  status?: string;
  paymentStatus?: string;
  attendanceToday?: string;
  joinedAt?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  isActive?: boolean;
}

export interface MemberPersonalInfo {
  bloodType?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactAltPhone?: string | null;
  medicalConditions?: string | null;
  allergies?: string | null;
  injuries?: string | null;
  medications?: string | null;
  doctorClearanceRequired?: boolean;
  healthNotes?: string | null;
  updatedAt?: string | null;
}
