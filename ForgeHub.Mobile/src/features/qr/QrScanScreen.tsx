import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { scanQr } from "@/api/checkInApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { CapacityBar } from "@/components/ui/CapacityBar";
import { colors } from "@/theme/colors";
import { QrScanResult } from "@/types/checkIn";
import { qrErrorMessage } from "@/utils/errors";

const cachedLocationMaxAgeMs = 60_000;

export function QrScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationStatus, setLocationStatus] = useState<Location.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QrScanResult | null>(null);
  const [locked, setLocked] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((response) => setLocationStatus(response.status))
      .catch(() => setLocationStatus(null));
  }, []);

  const mutation = useMutation({
    mutationFn: async (payload: string) => {
      if (locationStatus !== Location.PermissionStatus.GRANTED) {
        throw new Error("Location permission is required for attendance validation.");
      }

      const preciseLocation = getPreciseLocation();
      const cached = await Location.getLastKnownPositionAsync({ maxAge: cachedLocationMaxAgeMs });
      if (cached) {
        try {
          const result = await scanQr(payload, cached.coords.latitude, cached.coords.longitude);
          void preciseLocation.catch(() => undefined);
          return result;
        } catch (error) {
          if (!isRangeError(error)) throw error;
          const precise = await preciseLocation;
          return scanQr(payload, precise.coords.latitude, precise.coords.longitude);
        }
      }

      const position = await preciseLocation;
      return scanQr(payload, position.coords.latitude, position.coords.longitude);
    },
    onSuccess: async (data) => {
      setResult(data);
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["branches", "access"] }),
        queryClient.invalidateQueries({ queryKey: ["membership"] }),
        queryClient.invalidateQueries({ queryKey: ["activeCheckIn"] })
      ]);
    },
    onError: (err) => {
      setError(qrErrorMessage(err));
      setLocked(false);
    }
  });

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (locked || mutation.isPending || result) return;
    setLocked(true);
    mutation.mutate(data);
  };

  const cameraGranted = Boolean(permission?.granted);
  const locationGranted = locationStatus === Location.PermissionStatus.GRANTED;
  const canScan = cameraGranted && locationGranted;
  const locationDenied = locationStatus === Location.PermissionStatus.DENIED;

  const requestLocationPermission = async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(response.status);
  };

  if (!canScan) {
    return (
      <ForgeScreen title="Scan QR" subtitle="Permissions required">
        <ForgeCard style={styles.card}>
          <Text style={styles.title}>Before you scan</Text>
          <Text style={styles.text}>ForgeHub uses the camera to read the branch QR code and your location only to validate gym check-in or checkout distance.</Text>
          <View style={styles.permissionRow}>
            <Text style={styles.permissionLabel}>Camera</Text>
            <Text style={[styles.permissionStatus, cameraGranted ? styles.ok : styles.warn]}>{cameraGranted ? "Granted" : "Needed"}</Text>
          </View>
          <View style={styles.permissionRow}>
            <Text style={styles.permissionLabel}>Location</Text>
            <Text style={[styles.permissionStatus, locationGranted ? styles.ok : styles.warn]}>{locationGranted ? "Granted" : locationDenied ? "Denied" : "Needed"}</Text>
          </View>
          {locationDenied ? <Text style={styles.error}>Location is required only for gym check-in validation. Enable foreground location permission to continue to the scanner.</Text> : null}
          {!cameraGranted ? <ForgeButton title="Allow Camera" onPress={requestPermission} /> : null}
          {!locationGranted ? <ForgeButton title="Allow Location" variant={cameraGranted ? "primary" : "secondary"} onPress={requestLocationPermission} /> : null}
          <ForgeButton title="Continue to Scanner" disabled={!canScan} onPress={() => undefined} />
        </ForgeCard>
      </ForgeScreen>
    );
  }

  return (
    <ForgeScreen title="Scan QR" subtitle="Check in at your branch" scroll={false}>
      <View style={styles.scannerWrap}>
        {!result ? <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={locked ? undefined : onBarcodeScanned} /> : null}
        {!result ? <View style={styles.overlay}><Text style={styles.overlayText}>{mutation.isPending ? "Validating..." : "Align the branch QR code"}</Text></View> : null}
        {error ? (
          <ForgeCard style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <ForgeButton title="Scan again" variant="secondary" onPress={() => { setError(null); setLocked(false); }} />
          </ForgeCard>
        ) : null}
        {result ? (
          <ForgeCard style={styles.feedback}>
            <Text style={styles.success}>{result.alreadyCheckedIn ? "Already checked in" : "Check-in confirmed"}</Text>
            <Text style={styles.title}>{result.branchName ?? "Branch"}</Text>
            <Text style={styles.text}>{result.message}</Text>
            {result.capacity ? <CapacityBar percentage={((result.currentOccupancy ?? 0) / result.capacity) * 100} /> : null}
            {result.capacity ? <Text style={styles.text}>{result.currentOccupancy ?? 0}/{result.capacity} inside</Text> : null}
            <ForgeButton title="Active check-in" onPress={() => router.replace("/active-checkin")} />
            <ForgeButton title="Home" variant="secondary" onPress={() => router.replace("/tabs/home")} />
          </ForgeCard>
        ) : null}
      </View>
    </ForgeScreen>
  );
}

function getPreciseLocation() {
  return Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<Location.LocationObject>((_, reject) => setTimeout(() => reject(new Error("Unable to get your location. Please try again.")), 12000))
  ]);
}

function isRangeError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("outside") || message.includes("range") || message.includes("distance");
}

const styles = StyleSheet.create({
  scannerWrap: { flex: 1, padding: 20, gap: 16 },
  camera: { flex: 1, borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  overlay: { position: "absolute", left: 40, right: 40, top: 120, alignItems: "center" },
  overlayText: { color: colors.text, backgroundColor: "rgba(15,23,42,0.8)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, fontWeight: "900", overflow: "hidden" },
  feedback: { gap: 14 },
  card: { gap: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", letterSpacing: 0 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  permissionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  permissionLabel: { color: colors.text, fontWeight: "900" },
  permissionStatus: { fontWeight: "900" },
  ok: { color: colors.success },
  warn: { color: colors.warning },
  error: { color: colors.danger, fontWeight: "800", lineHeight: 20 },
  success: { color: colors.success, fontSize: 14, fontWeight: "900", letterSpacing: 0 }
});
