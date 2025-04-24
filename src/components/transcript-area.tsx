"use client";

import { useRef, useEffect } from "react";
import useSettingsStore, { TranscriptEntry } from "~/stores/useSettingsStore";

export default function TranscriptArea() {
  const { transcript } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Автопрокрутка вниз при обновлении транскрипции
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div
      ref={containerRef}
      className="mt-4 max-h-full min-h-full w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-4"
    >
      {Array.isArray(transcript) && transcript.length > 0 ? (
        transcript.map((entry: TranscriptEntry, index: number) => (
          <div
            key={index}
            className={`mb-4 flex ${
              entry.role === "agent" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
                entry.role === "agent"
                  ? "bg-gray-100 text-gray-900"
                  : "bg-black/90 text-white"
              }`}
            >
              <p className="whitespace-pre-wrap">{entry.message}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500">Нет доступного транскрипта.</p>
      )}
    </div>
  );
}