import { Membership } from "@/types/membership";
import { getJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapMembership } from "./mappers";

export async function getMembership(): Promise<Membership> {
  return mapMembership(await getJson(endpoints.membership));
}
