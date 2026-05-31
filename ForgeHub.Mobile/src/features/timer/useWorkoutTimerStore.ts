import AsyncStorage from "@react-native-async-storage/async-storage";
import { Vibration } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WorkoutTimerMode = "timer" | "countdown" | "laps";

interface StartTimerOptions {
  countdownDurationMs?: number;
  activeDrillId?: string | null;
  activeWorkoutId?: string | null;
}

interface WorkoutTimerState {
  mode: WorkoutTimerMode;
  isRunning: boolean;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedElapsedMs: number;
  countdownDurationMs: number;
  laps: number[];
  activeDrillId: string | null;
  activeWorkoutId: string | null;
  completed: boolean;
  startTimer: (mode: WorkoutTimerMode, options?: StartTimerOptions) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  addLap: () => void;
  switchMode: (mode: WorkoutTimerMode) => void;
  setCountdownDuration: (durationMs: number) => void;
  getElapsedMs: () => number;
  getRemainingMs: () => number;
  syncCountdownCompletion: () => boolean;
}

const DEFAULT_COUNTDOWN_MS = 60_000;
const COUNTDOWN_FINISHED_VIBRATION = [0, 250, 150, 250, 150, 250];
let countdownCompletionTimeout: ReturnType<typeof setTimeout> | null = null;

function getElapsedFromState(state: Pick<WorkoutTimerState, "accumulatedElapsedMs" | "isRunning" | "startedAt">) {
  if (!state.isRunning || state.startedAt === null) {
    return state.accumulatedElapsedMs;
  }

  return Math.max(0, state.accumulatedElapsedMs + Date.now() - state.startedAt);
}

function clearCountdownCompletionTimeout() {
  if (countdownCompletionTimeout !== null) {
    clearTimeout(countdownCompletionTimeout);
    countdownCompletionTimeout = null;
  }
}

function scheduleCountdownCompletion(state: WorkoutTimerState, complete: () => void) {
  clearCountdownCompletionTimeout();

  if (state.mode !== "countdown" || !state.isRunning) {
    return;
  }

  const remainingMs = Math.max(0, state.countdownDurationMs - getElapsedFromState(state));
  if (remainingMs <= 0) {
    complete();
    return;
  }

  countdownCompletionTimeout = setTimeout(complete, remainingMs + 50);
}

export const useWorkoutTimerStore = create<WorkoutTimerState>()(
  persist(
    (set, get) => ({
      mode: "laps",
      isRunning: false,
      startedAt: null,
      pausedAt: null,
      accumulatedElapsedMs: 0,
      countdownDurationMs: DEFAULT_COUNTDOWN_MS,
      laps: [],
      activeDrillId: null,
      activeWorkoutId: null,
      completed: false,
      startTimer: (mode, options) => {
        const now = Date.now();
        const durationMs = options?.countdownDurationMs;

        set((state) => ({
          mode,
          isRunning: true,
          startedAt: now,
          pausedAt: null,
          accumulatedElapsedMs: state.mode === mode ? state.accumulatedElapsedMs : 0,
          countdownDurationMs: mode === "countdown" && durationMs ? durationMs : state.countdownDurationMs,
          activeDrillId: options?.activeDrillId ?? state.activeDrillId,
          activeWorkoutId: options?.activeWorkoutId ?? state.activeWorkoutId,
          completed: false
        }));
        scheduleCountdownCompletion(get(), () => get().syncCountdownCompletion());
      },
      pauseTimer: () => {
        const state = get();
        if (!state.isRunning) {
          return;
        }

        set({
          isRunning: false,
          startedAt: null,
          pausedAt: Date.now(),
          accumulatedElapsedMs: getElapsedFromState(state)
        });
        clearCountdownCompletionTimeout();
      },
      resumeTimer: () => {
        const state = get();
        if (state.isRunning || state.completed) {
          return;
        }

        set({
          isRunning: true,
          startedAt: Date.now(),
          pausedAt: null,
          completed: false
        });
        scheduleCountdownCompletion(get(), () => get().syncCountdownCompletion());
      },
      resetTimer: () => {
        clearCountdownCompletionTimeout();
        set((state) => ({
          isRunning: false,
          startedAt: null,
          pausedAt: null,
          accumulatedElapsedMs: 0,
          laps: [],
          completed: false,
          countdownDurationMs: state.countdownDurationMs
        }));
      },
      addLap: () => {
        const state = get();
        if (!state.isRunning) {
          return;
        }

        set({ laps: [getElapsedFromState(state), ...state.laps] });
      },
      switchMode: (mode) => {
        set({ mode });
        scheduleCountdownCompletion(get(), () => get().syncCountdownCompletion());
      },
      setCountdownDuration: (durationMs) => {
        clearCountdownCompletionTimeout();
        set({
          mode: "countdown",
          isRunning: false,
          startedAt: null,
          pausedAt: null,
          accumulatedElapsedMs: 0,
          countdownDurationMs: Math.max(1000, durationMs),
          completed: false
        });
      },
      getElapsedMs: () => getElapsedFromState(get()),
      getRemainingMs: () => {
        const state = get();
        if (state.mode !== "countdown") {
          return 0;
        }

        return Math.max(0, state.countdownDurationMs - getElapsedFromState(state));
      },
      syncCountdownCompletion: () => {
        const state = get();
        if (state.mode !== "countdown" || !state.isRunning) {
          return false;
        }

        const remainingMs = Math.max(0, state.countdownDurationMs - getElapsedFromState(state));
        if (remainingMs > 0) {
          return false;
        }

        set({
          isRunning: false,
          startedAt: null,
          pausedAt: Date.now(),
          accumulatedElapsedMs: state.countdownDurationMs,
          completed: true
        });
        clearCountdownCompletionTimeout();
        Vibration.vibrate(COUNTDOWN_FINISHED_VIBRATION);
        return true;
      }
    }),
    {
      name: "forgehub-workout-timer",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mode: state.mode,
        isRunning: state.isRunning,
        startedAt: state.startedAt,
        pausedAt: state.pausedAt,
        accumulatedElapsedMs: state.accumulatedElapsedMs,
        countdownDurationMs: state.countdownDurationMs,
        laps: state.laps,
        activeDrillId: state.activeDrillId,
        activeWorkoutId: state.activeWorkoutId,
        completed: state.completed
      }),
      onRehydrateStorage: () => (state) => {
        state?.syncCountdownCompletion();
        if (state) {
          scheduleCountdownCompletion(state, state.syncCountdownCompletion);
        }
      }
    }
  )
);
