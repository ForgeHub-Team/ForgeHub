import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { colors } from "@/theme/colors";
import { useWorkoutTimerStore, WorkoutTimerMode } from "@/features/timer/useWorkoutTimerStore";

const baseActions = [
  { label: "Book Class", icon: "calendar-star", route: "/tabs/classes" },
  { label: "Timer", icon: "timer-outline", route: "timer" },
  { label: "My Plan", icon: "card-account-details-outline", route: "/membership" },
  { label: "Payments", icon: "credit-card-outline", route: "/tabs/payments" },
  { label: "Profile", icon: "account-circle-outline", route: "/tabs/profile" }
] as const;

export function QuickActionsGrid({ hasActiveSession = false }: { hasActiveSession?: boolean }) {
  const [timerOpen, setTimerOpen] = useState(false);
  const actions = [
    { label: hasActiveSession ? "Check Out" : "Check In", icon: hasActiveSession ? "exit-run" : "qrcode-scan", route: hasActiveSession ? "/active-checkin" : "/qr-scan" },
    ...baseActions
  ] as const;
  const rows = [actions.slice(0, 3), actions.slice(3, 6)];

  return (
    <>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((action) => (
              <Pressable key={action.label} onPress={() => action.route === "timer" ? setTimerOpen(true) : router.push(action.route)} style={styles.item}>
                <MaterialCommunityIcons name={action.icon} color={colors.primary} size={24} />
                <Text style={styles.label}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      <TimerMiniModal open={timerOpen} onClose={() => setTimerOpen(false)} />
    </>
  );
}

function TimerMiniModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [now, setNow] = useState(Date.now());
  const [minutes, setMinutes] = useState("1");
  const timer = useWorkoutTimerStore();
  const elapsedMs = timer.getElapsedMs();
  const remainingMs = timer.getRemainingMs();
  const displayMs = timer.mode === "countdown" ? remainingMs : elapsedMs;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    void now;
    timer.syncCountdownCompletion();
  }, [now, timer]);

  const switchMode = (mode: WorkoutTimerMode) => {
    timer.switchMode(mode);
  };

  const start = () => {
    if (timer.mode === "countdown") {
      timer.startTimer("countdown", { countdownDurationMs: Math.max(1, Number(minutes) || 1) * 60_000 });
      return;
    }

    timer.startTimer(timer.mode);
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Clock</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" color={colors.text} size={22} />
            </Pressable>
          </View>

          <View style={styles.segmentRow}>
            {(["timer", "countdown", "laps"] as WorkoutTimerMode[]).map((mode) => (
              <Pressable key={mode} onPress={() => switchMode(mode)} style={[styles.segment, timer.mode === mode && styles.segmentActive]}>
                <Text style={[styles.segmentText, timer.mode === mode && styles.segmentTextActive]}>{mode === "laps" ? "Laps" : mode === "countdown" ? "Countdown" : "Timer"}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.timeFace}>{formatDuration(displayMs)}</Text>
          <Text style={styles.modeText}>{timer.isRunning ? "Running" : timer.completed ? "Done" : "Ready"}</Text>

          {timer.mode === "countdown" ? (
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Minutes</Text>
              <TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={styles.input} />
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <ForgeButton title={timer.isRunning ? "Pause" : "Start"} onPress={timer.isRunning ? timer.pauseTimer : start} style={styles.flexButton} />
            <ForgeButton title="Reset" variant="secondary" onPress={timer.resetTimer} style={styles.flexButton} />
          </View>
          {timer.mode === "laps" ? <ForgeButton title="Lap" variant="secondary" disabled={!timer.isRunning} onPress={timer.addLap} /> : null}
          {timer.mode === "laps" && timer.laps.length ? (
            <View style={styles.lapList}>
              {timer.laps.slice(0, 5).map((lap, index) => <Text key={`${lap}-${index}`} style={styles.lapText}>Lap {timer.laps.length - index}: {formatDuration(lap)}</Text>)}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  gridRow: { flexDirection: "row", gap: 10 },
  item: { flex: 1, minHeight: 86, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 6 },
  label: { color: colors.text, fontWeight: "800", fontSize: 13, letterSpacing: 0, textAlign: "center" },
  modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { gap: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: 0 },
  closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.surface2 },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.text, fontWeight: "900", fontSize: 12 },
  segmentTextActive: { color: colors.white },
  timeFace: { color: colors.primary, fontSize: 48, fontWeight: "300", letterSpacing: 0, textAlign: "center" },
  modeText: { color: colors.muted, fontWeight: "800", textAlign: "center" },
  inputRow: { gap: 6 },
  inputLabel: { color: colors.muted, fontWeight: "800" },
  input: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 12, fontWeight: "900" },
  buttonRow: { flexDirection: "row", gap: 10 },
  flexButton: { flex: 1 },
  lapList: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  lapText: { color: colors.warm, fontWeight: "800" }
});
