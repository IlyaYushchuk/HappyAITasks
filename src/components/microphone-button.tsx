"use client";

import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import AudioVisualizer from "./AudioVisualizer"; 

interface MicrophoneButtonProps {
  status: "disconnected" | "connecting" | "connected";
  audioStream: MediaStream | null;
  isUserSpeaking: boolean;
  isAIPlaying: boolean;
  aiAudioElement: HTMLAudioElement | null;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  setIsUserSpeaking: (isSpeaking: boolean) => void;
}

export default function MicrophoneButton({
  status,
  audioStream,
  isUserSpeaking,
  isAIPlaying,
  aiAudioElement,
  startSession,
  endSession,
  setIsUserSpeaking,
}: MicrophoneButtonProps) {
  const handleClick = async () => {
    if (status === "disconnected") {
      await startSession();
    } else if (status === "connected") {
      await endSession();
    }
  };

  const handleUserSpeakingChange = (isSpeaking: boolean) => {
    if (!isAIPlaying) {
      setIsUserSpeaking(isSpeaking);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4" style={{ width: "100%" }}>
      {status === "connected" && (
        <AudioVisualizer
          isActive={status === "connected"}
          stream={audioStream}
          aiAudioElement={aiAudioElement}
          isUserSpeaking={isUserSpeaking}
          isAIPlaying={isAIPlaying}
          onUserSpeakingChange={handleUserSpeakingChange}
          className="w-full"
        />
      )}
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