import { AuthUser, LoginRequest, LoginResponse } from "@/types/auth";
import { getStableDeviceId, getRefreshToken } from "@/auth/tokenStorage";
import { getJson, postJson } from "./apiClient";
import { endpoints } from "./endpoints";

export async function login(identifier: string, password: string) {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");
  const normalizedIdentifier = isEmail ? trimmed.toLowerCase() : trimmed;
  const request: LoginRequest = {
    identifier: normalizedIdentifier,
    ...(isEmail ? { email: normalizedIdentifier } : { phone: normalizedIdentifier }),
    password,
    deviceId: await getStableDeviceId()
  };
  return postJson<LoginResponse>(endpoints.auth.login, request);
}

export async function getMe() {
  return getJson<AuthUser>(endpoints.auth.me);
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return;
  await postJson<void>(endpoints.auth.logout, { refreshToken });
}
