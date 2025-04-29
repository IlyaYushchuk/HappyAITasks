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
  const [agentAmplitude, setAgentAmplitude] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { setScoreArray, setTranscript } = useSettingsStore();

  const conversation = useConversation({
    onConnect: () => console.log("Connected"),
    onDisconnect: () => console.log("Disconnected"),
    onMessage: (message: any) => {
      console.log("Message received:", message);
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
      conversation.isSpeaking
    );
  }, [conversation.status, conversation.isSpeaking]);

  // Отслеживание размеров родительского контейнера
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        console.log("Container dimensions updated:", { width, height });
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

  // Инициализация Web Audio API для пользователя и попытка анализа ИИ
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone access granted, stream active:", stream.active);
        console.log("Microphone stream tracks:", stream.getAudioTracks());
        audioContextRef.current = new AudioContext();
        
        // Анализатор для пользователя
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        // Анализатор для ИИ (если доступен)
        agentAnalyserRef.current = audioContextRef.current.createAnalyser();
        agentAnalyserRef.current.fftSize = 128;

        const updateAmplitude = () => {
          if (!analyserRef.current || !agentAnalyserRef.current) return;

          // Пользовательская волна
          const userDataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(userDataArray);
          const userAverage = userDataArray.reduce((sum, val) => sum + val, 0) / userDataArray.length;
          const userNormalized = Math.min(userAverage / 128, 1);
          setUserAmplitude(Array(30).fill(userNormalized * dimensions.height * 0.4));

          // Волна ИИ
          if (conversation.isSpeaking) {
            const agentDataArray = conversation.getOutputByteFrequencyData();
            if (agentDataArray && agentDataArray.length > 0) {
              // Реальный анализ аудио ИИ
              const agentAverage = agentDataArray.reduce((sum: number, val: number) => sum + val, 0) / agentDataArray.length;
              const agentNormalized = Math.min(agentAverage / 128, 1);
              setAgentAmplitude(
                Array(30).fill(agentNormalized * dimensions.height * 0.4).map((amp) => amp * (0.8 + Math.random() * 0.4))
              );
              console.log("Agent audio data:", { agentAverage, agentNormalized });
            } else {
              // Имитация анализа с случайностью
              const simulatedAverage = 0.5 + Math.random() * 0.5; // Псевдо-амплитуда
              setAgentAmplitude(
                Array(30).fill(simulatedAverage * dimensions.height * 0.4).map((amp) => amp * (0.8 + Math.random() * 0.4))
              );
              console.log("Simulated agent amplitude:", simulatedAverage);
            }
          } else {
            setAgentAmplitude(Array(30).fill(0));
          }

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
  }, [conversation.status, conversation.isSpeaking, dimensions.height]);

  // Генерация точек волны
  const generateWavePoints = (amplitude: number[]) => {
    const points: string[] = [];
    const step = dimensions.width / (amplitude.length - 1);
    amplitude.forEach((amp, i) => {
      const x = i * step;
      const y = dimensions.height / 2 + amp * Math.sin((i / amplitude.length) * Math.PI * 6);
      points.push(`${x},${y}`);
    });
    return points.join(" ");
  };

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
      conversation.isSpeaking
    );
    if (conversation.status === "disconnected") {
      await startConversation();
    } else if (conversation.status === "connected") {
      await stopConversation();
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div ref={containerRef} className="w-full h-24">
        <svg width={dimensions.width} height={dimensions.height} preserveAspectRatio="xMidYMid meet">
          <AnimatePresence>
            {conversation.status === "connected" && userAmplitude.length > 0 && !conversation.isSpeaking && (
              <motion.polyline
                key="user-wave"
                points={generateWavePoints(userAmplitude)}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              />
            )}
            {conversation.status === "connected" && conversation.isSpeaking && (
              <motion.polyline
                key="elevenlabs-wave"
                points={generateWavePoints(agentAmplitude)}
                stroke="#ef4444"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
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