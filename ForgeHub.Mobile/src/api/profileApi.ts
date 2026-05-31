import { MemberProfile } from "@/types/profile";
import { getJson, putJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapProfile } from "./mappers";

export async function getProfile(): Promise<MemberProfile> {
  return mapProfile(await getJson(endpoints.profile));
}

export async function updateProfile(profile: MemberProfile): Promise<MemberProfile> {
  return mapProfile(await putJson(endpoints.profile, profile));
}
