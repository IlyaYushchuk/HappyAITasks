/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";

interface MicrophoneButtonProps {
  status: "disconnected" | "connecting" | "connected";
  audioStream: MediaStream | null;
  isUserSpeaking: boolean;
  isAIPlaying: boolean;
  aiAudioData: Float32Array | null;
  userAudioData: Float32Array | null;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  setIsUserSpeaking: (isSpeaking: boolean) => void;
}

export default function MicrophoneButton({
  status,
  startSession,
  endSession,
}: MicrophoneButtonProps) {
  const handleClick = async () => {
    if (status === "disconnected") {
      await startSession();
    } else if (status === "connected") {
      await endSession();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4" style={{ width: "100%" }}>
      <Button
        onClick={handleClick}
        className={`h-16 w-full rounded-lg text-lg font-semibold shadow-md transition-all duration-300 ${
          status === "connected"
            ? "border-none bg-red-600 hover:bg-red-700"
            : "border border-gray-200 bg-primary hover:bg-primary/90"
        } flex transform items-center justify-center space-x-2 text-primary-foreground`}
      >
        {status === "connecting" ? (
          <>
            <Loader2 className="mr-2 animate-spin" size={24} />
            <span>Подключение...</span>
          </>
        ) : status === "connected" ? (
          <>
            <MicOff className="mr-2" size={24} />
            <span>Отключиться</span>
          </>
        ) : (
          <>
            <Mic className="mr-2" size={24} />
            <span>Подключиться</span>
          </>
        )}
      </Button>
    </div>
  );
}