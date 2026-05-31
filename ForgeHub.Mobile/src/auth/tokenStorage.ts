import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "forgehub.accessToken";
const REFRESH_TOKEN_KEY = "forgehub.refreshToken";
const DEVICE_ID_KEY = "forgehub.deviceId";

let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    if (!SecureStore || typeof SecureStore.isAvailableAsync !== "function") {
      return false;
    }

    const available = await SecureStore.isAvailableAsync();
    if (!available) {
      return false;
    }

    return (
      typeof SecureStore.getItemAsync === "function" &&
      typeof SecureStore.setItemAsync === "function" &&
      typeof SecureStore.deleteItemAsync === "function"
    );
  } catch (error) {
    console.warn("SecureStore availability check failed.", error);
    return false;
  }
}

export async function saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
  accessTokenMemory = accessToken;
  refreshTokenMemory = refreshToken ?? null;
  await clearPersistedAuthTokens();
}

export async function getAccessToken(): Promise<string | null> {
  await clearPersistedAuthTokens();
  return accessTokenMemory;
}

export async function getRefreshToken(): Promise<string | null> {
  await clearPersistedAuthTokens();
  return refreshTokenMemory;
}

export async function clearTokens(): Promise<void> {
  accessTokenMemory = null;
  refreshTokenMemory = null;
  await clearPersistedAuthTokens();
}

async function clearPersistedAuthTokens(): Promise<void> {
  const secureAvailable = await canUseSecureStore();

  if (secureAvailable) {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.warn("SecureStore access token delete failed.", error);
    }

    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.warn("SecureStore refresh token delete failed.", error);
    }
  }

  try {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  } catch (error) {
    console.warn("AsyncStorage token cleanup failed.", error);
  }
}

export async function getStableDeviceId(): Promise<string> {
  const secureAvailable = await canUseSecureStore();

  if (secureAvailable) {
    try {
      const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (existing) {
        return existing;
      }

      const deviceId = createDeviceId();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      return deviceId;
    } catch (error) {
      console.warn("SecureStore device id access failed. Falling back to AsyncStorage.", error);
    }
  }

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = createDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function createDeviceId() {
  return `forgehub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
