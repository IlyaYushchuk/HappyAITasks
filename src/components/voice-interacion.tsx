// app/components/voice-interaction.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useConversation } from "@11labs/react";
import { env } from "~/env";
import { analyzeConversation } from "~/lib/conversation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import useSettingsStore from "~/stores/useSettingsStore";

export default function VoiceInteraction() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 100 });
  const [userAmplitude, setUserAmplitude] = useState<number[]>([]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false); // Обход для isSpeaking
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { setScoreArray, setTranscript } = useSettingsStore();

  const conversation = useConversation({
    onConnect: () => console.log("Connected"),
    onDisconnect: () => console.log("Disconnected"),
    onMessage: (message: any) => {
      console.log("Message received:", message);
      setIsAgentSpeaking(true);
      setTimeout(() => setIsAgentSpeaking(false), 1500); // Уменьшено до 1.5 секунд для более быстрой реакции
    },
    onError: (error: any) => {
      console.error("ElevenLabs error:", error);
      toast.error("Ошибка ElevenLabs: " + error.message);
    },
  });

  // Отладка status и isSpeaking
  useEffect(() => {
    console.log(
      "VoiceInteraction: status =",
      conversation.status,
      "isSpeaking =",
      conversation.isSpeaking,
      "isAgentSpeaking =",
      isAgentSpeaking
    );
  }, [conversation.status, conversation.isSpeaking, isAgentSpeaking]);

  // Отслеживание размеров родительского контейнера
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: height || 100 });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Инициализация Web Audio API для анализа микрофона
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone access granted, stream active:", stream.active);
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128; // Уменьшено для более быстрой реакции
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const updateAmplitude = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          const normalized = Math.min(average / 128, 1);
          setUserAmplitude(Array(20).fill(normalized * dimensions.height * 0.4));
          animationFrameRef.current = requestAnimationFrame(updateAmplitude);
        };

        updateAmplitude();
      } catch (error) {
        console.error("Failed to setup audio:", error);
        toast.error("Не удалось получить доступ к микрофону. Проверьте настройки браузера.");
      }
    };

    if (conversation.status === "connected") {
      setupAudio();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [conversation.status, dimensions.height]);

  // Генерация точек волны
  const generateWavePoints = (amplitude: number[]) => {
    const points: string[] = [];
    const step = dimensions.width / (amplitude.length - 1);
    amplitude.forEach((amp, i) => {
      const x = i * step;
      const y = dimensions.height / 2 + amp * Math.sin((i / amplitude.length) * Math.PI * 4);
      points.push(`${x},${y}`);
    });
    return points.join(" ");
  };

  // Симуляция амплитуды для ElevenLabs
  const elevenLabsAmplitude = isAgentSpeaking
    ? Array(20).fill((dimensions.height * 0.4) * Math.sin(Date.now() / 100))
    : Array(20).fill(0);

  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const id = await conversation.startSession({
        agentId: env.NEXT_PUBLIC_VOICE_AGENT_ID,
      });
      setConversationId(id);
      console.log("Started conversation with ID:", id);
      toast.success("Диалог начат!");
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Не удалось начать диалог. Проверьте микрофон или настройки ElevenLabs.");
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setConversationId(null);
      setIsAgentSpeaking(false);
      toast.loading("Анализируем диалог...");
      await analyzeConversation(conversationId, setScoreArray, setTranscript);
      console.log("Stopped conversation");
    } catch (error) {
      console.error("Failed to stop conversation:", error);
      toast.error("Ошибка при завершении диалога.");
    }
  }, [conversation, conversationId, setScoreArray, setTranscript]);

  const handleClick = async () => {
    console.log(
      "Button clicked, current status:",
      conversation.status,
      "isSpeaking:",
      conversation.isSpeaking,
      "isAgentSpeaking:",
      isAgentSpeaking
    );
    if (conversation.status === "disconnected") {
      await startConversation();
    } else if (conversation.status === "connected") {
      await stopConversation();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={containerRef} className="w-full h-24">
        <svg width={dimensions.width} height={dimensions.height} preserveAspectRatio="xMidYMid meet">
          <AnimatePresence>
            {conversation.status === "connected" && userAmplitude.length > 0 && !isAgentSpeaking && (
              <motion.polyline
                key="user-wave"
                points={generateWavePoints(userAmplitude)}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0 }}
              />
            )}
            {conversation.status === "connected" && isAgentSpeaking && (
              <motion.polyline
                key="elevenlabs-wave"
                points={generateWavePoints(elevenLabsAmplitude)}
                stroke="#ef4444"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0 }}
              />
            )}
          </AnimatePresence>
        </svg>
      </div>
      <Button
        onClick={handleClick}
        className={`h-16 w-full rounded-lg text-lg font-semibold shadow-md transition-all duration-300 ${
          conversation.status === "connected"
            ? "border-none bg-red-600 hover:bg-red-700"
            : "border border-gray-200 bg-primary hover:bg-primary/90"
        } flex transform items-center justify-center space-x-2 text-primary-foreground`}
      >
        {conversation.status === "connecting" ? (
          <>
            <Loader2 className="mr-2 animate-spin" size={24} />
            <span>Подключение...</span>
          </>
        ) : conversation.status === "connected" ? (
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