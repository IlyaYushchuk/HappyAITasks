// app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import CriteriaTable from "~/components/criteria-table";
import SettingsModal from "~/components/settings-modal";
import { Button } from "~/components/ui/button";
import TranscriptArea from "~/components/transcript-area";
import useSettingsStore from "~/stores/useSettingsStore";
import VoiceInteraction from "~/components/voice-interacion";

export default function Home() {
  const [isOpened, setIsOpened] = useState(false);
  const { scoreArray } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("Score array updated:", scoreArray);
  }, [scoreArray]);

  // Отладка ширины родительского контейнера
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        console.log("Parent container width:", width);
      }
    };

    updateContainerWidth();
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
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
          <div
            className={`overflow-hidden transition-all duration-700 ${
              isOpened || scoreArray.length > 0
                ? "w-2/3 translate-x-0 pr-8 opacity-100"
                : "w-0 -translate-x-full pr-0 opacity-0"
            }`}
          >
            <CriteriaTable />
          </div>

          <div
            ref={containerRef}
            className={`flex flex-col justify-center transition-all duration-700 w-full max-w-md mx-auto ${
              isOpened || scoreArray.length > 0 ? "items-center" : "items-center"
            }`}
          >
            <VoiceInteraction />
            <TranscriptArea />
          </div>
        </div>
      </main>
    </div>
  );
}