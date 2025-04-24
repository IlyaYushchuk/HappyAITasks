"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, XIcon } from "lucide-react";
import CriteriaTable from "~/components/criteria-table";
import SettingsModal from "~/components/settings-modal";
import { Button } from "~/components/ui/button";
import MicrophoneButton from "~/components/microphone-button";
import TranscriptArea from "~/components/transcript-area";
import useSettingsStore from "~/stores/useSettingsStore";
import { useWebSocketLogic } from "~/lib/useWebSocketLogic";

export default function Home() {
  const [isOpened, setIsOpened] = useState(false);
  const { scoreArray } = useSettingsStore();

  // Используем хук для управления WebSocket и состояниями
  const {
    status,
    audioStream,
    isUserSpeaking,
    isAIPlaying,
    aiAudioElement,
    startSession,
    endSession,
    setIsUserSpeaking,
  } = useWebSocketLogic();

  useEffect(() => {
    console.log("Score array:", scoreArray);
  }, [scoreArray]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* <Button
        onClick={() => setIsOpened(!isOpened)}
        className="fixed left-3 top-4"
        variant={"outline"}
      >
        <XIcon />
      </Button> */}
      <header className="border-b border-gray-200 bg-gray-100">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="https://happyai.one"
            className="text-2xl font-bold text-gray-800 transition-colors hover:text-gray-600"
          >
            HappyAI
          </Link>
          <SettingsModal>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </SettingsModal>
        </div>
      </header>

      <main className="container mx-auto flex-grow px-4 py-8 sm:px-6 lg:px-8">
        <div
          className={`flex items-start transition-all duration-700 ease-in-out ${
            isOpened ? "justify-between" : "justify-center"
          }`}
        >
          {/* Left Column: CriteriaTable */}
          <div
            className={`overflow-hidden transition-all duration-700 ${
              isOpened || scoreArray.length > 0
                ? "w-2/3 translate-x-0 pr-8 opacity-100"
                : "w-0 -translate-x-full pr-0 opacity-0"
            }`}
          >
            <CriteriaTable />
          </div>

          {/* Right Column: Microphone and TranscriptArea */}
          <div
            className={`flex flex-col justify-center transition-all duration-700 ${
              isOpened || scoreArray.length > 0
                ? "w-1/3 items-center"
                : "w-full items-center px-96"
            }`}
          >
            <MicrophoneButton
              status={status}
              audioStream={audioStream}
              isUserSpeaking={isUserSpeaking}
              isAIPlaying={isAIPlaying}
              aiAudioElement={aiAudioElement}
              startSession={startSession}
              endSession={endSession}
              setIsUserSpeaking={setIsUserSpeaking}
            />
            <TranscriptArea />
          </div>
        </div>
      </main>
    </div>
  );
}