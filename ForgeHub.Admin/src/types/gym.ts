export interface Gym {
  id: number;
  name: string;
  ownerUserId?: number | null;
  ownerName?: string;
  logoUrl?: string | null;
  city?: string | null;
  branches?: number;
  members?: number;
  monthlyRevenue?: number;
  status?: string;
  isActive?: boolean;
  createdAt?: string | null;
}
