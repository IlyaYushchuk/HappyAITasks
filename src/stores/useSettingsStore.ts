/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

export interface TranscriptEntry {
  role: "agent" | "user";
  message: string;
  tool_calls: any | null;
  tool_results: any | null;
  feedback: any | null;
  time_in_call_secs: number;
  conversation_turn_metrics: any | null;
}

interface SettingsState {
  transcript: TranscriptEntry[];
  scoreArray: number[];
}

interface SettingsActions {
  setTranscript: (data: TranscriptEntry[]) => void;
  setScoreArray: (array: number[]) => void;
}

const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  transcript: [],
  scoreArray: [],
  setTranscript: (data) => set({ transcript: data }),
  setScoreArray: (array) => set({ scoreArray: array }),
}));

export default useSettingsStore;