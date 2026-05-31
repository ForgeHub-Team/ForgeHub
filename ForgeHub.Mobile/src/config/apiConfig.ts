const rawApiBaseUrl = process.env.EXPO_PUBLIC_FORGEHUB_API_BASE_URL;

if (!rawApiBaseUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_FORGEHUB_API_BASE_URL. Set it in ForgeHub.Mobile/.env and restart Expo with -c."
  );
}

const trimmedApiBaseUrl = rawApiBaseUrl.trim().replace(/\/$/, "");

export const API_ORIGIN = trimmedApiBaseUrl.endsWith("/api")
  ? trimmedApiBaseUrl.slice(0, -4)
  : trimmedApiBaseUrl;

export const API_BASE_URL = trimmedApiBaseUrl.endsWith("/api")
  ? trimmedApiBaseUrl
  : `${trimmedApiBaseUrl}/api`;

if (__DEV__) {
  console.log("[ForgeHub] API_ORIGIN =", API_ORIGIN);
  console.log("[ForgeHub] API_BASE_URL =", API_BASE_URL);
}
