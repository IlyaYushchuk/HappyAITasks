/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useEffect, useRef } from "react";
import { env } from "~/env";
import useSettingsStore from "~/stores/useSettingsStore";
import toast from "react-hot-toast";

interface WebSocketLogic {
  status: "disconnected" | "connecting" | "connected";
  audioStream: MediaStream | null;
  isUserSpeaking: boolean;
  isAIPlaying: boolean;
  aiAudioElement: HTMLAudioElement | null;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  setIsUserSpeaking: (isSpeaking: boolean) => void;
}

export function useWebSocketLogic(): WebSocketLogic {
  const { setScoreArray, setTranscript } = useSettingsStore();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [aiAudioElement, setAIAudioElement] = useState<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const websocketRef = useRef<WebSocket | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioProcessorRef = useRef<() => void>(() => {});
  const audioContextRef = useRef<AudioContext | null>(null);

  // Функция для отправки аудио с микрофона через WebSocket
  const sendMicrophoneAudio = async (stream: MediaStream) => {
    if (!websocketRef.current) return;

    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    let lastLogTime = 0;
    processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      console.log(`[${new Date().toISOString()}] First 10 audio samples (raw):`, inputBuffer.slice(0, 10)); // Логируем сырые данные
      const binary = convertFloat32ToInt16(inputBuffer);
      const base64Audio = arrayBufferToBase64(binary);
      console.log(`[${new Date().toISOString()}] First 10 bytes of audio (after conversion):`, new Uint8Array(binary).slice(0, 10));
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(
          JSON.stringify({ user_audio_chunk: base64Audio })
        );
        const now = Date.now();
        if (now - lastLogTime > 1000) {
          console.log(`[${new Date().toISOString()}] Sent user audio chunk`);
          lastLogTime = now;
        }
      }
    };

    audioProcessorRef.current = () => {
      processor.disconnect();
      source.disconnect();
      audioContext.close();
    };
  };

  // Конвертация аудиоданных в Int16
  const convertFloat32ToInt16 = (buffer: Float32Array) => {
    if (!buffer) {
      console.error("Buffer is undefined or null");
      return new ArrayBuffer(0);
    }
    const len = buffer.length;
    const result = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = Math.max(-32768, Math.min(32767, buffer[i] * 32768));
    }
    return result.buffer;
  };

  // Конвертация ArrayBuffer в base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Воспроизведение PCM через AudioContext
  const playPcmAudio = (base64Audio: string) => {
    try {
      const audioData = atob(base64Audio);
      const pcmData = new Int16Array(audioData.length / 2);
      for (let i = 0; i < audioData.length; i += 2) {
        pcmData[i / 2] = (audioData.charCodeAt(i + 1) << 8) | audioData.charCodeAt(i);
      }

      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, floatData.length, 16000);
      audioBuffer.getChannelData(0).set(floatData);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        console.log(`[${new Date().toISOString()}] AI audio playback ended`);
        setIsAIPlaying(false);
      };
      source.start();
      setIsAIPlaying(true);
      console.log(`[${new Date().toISOString()}] AI audio playback started`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] PCM playback error:`, error);
      setIsAIPlaying(false);
    }
  };

  const fetchData = async () => {
    if (!conversationId) return { status: "error" };
    const response = await fetch(`/api/routes/conversation/${conversationId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await fetchData();
    }

    const data = await response.json();

    if (data.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await fetchData();
    } else {
      console.log("Conversation analysis:", data);
      return data;
    }
  };

  const analyzeConversation = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const data = await fetchData();
      if (!data.transcript) return;

      setTranscript(data.transcript);

      const analysis = await fetch("/api/routes/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: JSON.stringify(data.transcript) }),
      });

      const analysisData = await analysis.json();
      const array = JSON.parse(analysisData.value).values;
      toast.dismiss();
      toast.success("Диалог успешно проанализирован!");
      setScoreArray(array);
    } catch (error) {
      console.error("Failed to analyze conversation:", error);
    }
  };

  const startSession = useCallback(async () => {
    try {
      setStatus("connecting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${env.NEXT_PUBLIC_VOICE_AGENT_ID}`;
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        console.log(`[${new Date().toISOString()}] WebSocket connected`);
        setStatus("connected");
        sendMicrophoneAudio(stream);

        // Отправляем keep_alive каждые 5 секунд, чтобы избежать таймаута
        setInterval(() => {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({ type: "keep_alive" }));
            console.log(`[${new Date().toISOString()}] Sent keep_alive`);
          }
        }, 5000);
      };

      websocketRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(`[${new Date().toISOString()}] WebSocket message received:`, message);

        if (message.type === "conversation_initiation_metadata") {
          const newConversationId =
            message.conversation_initiation_metadata_event.conversation_id;
          setConversationId(newConversationId);
          console.log(`[${new Date().toISOString()}] Conversation ID received: ${newConversationId}`);
        }

        if (message.type === "audio") {
          setIsUserSpeaking(false);
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

          if (message.audio_event?.audio_base_64) {
            playPcmAudio(message.audio_event.audio_base_64);
          }

          if (message.audio_event?.isFinal) {
            console.log(`[${new Date().toISOString()}] AI audio stream ended (isFinal)`);
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          } else {
            silenceTimeoutRef.current = setTimeout(() => {
              if (isAIPlaying) {
                console.log(`[${new Date().toISOString()}] AI audio stream ended (silence timeout)`);
                setIsAIPlaying(false);
              }
            }, 1000);
          }
        }

        if (message.type === "user_transcript") {
          console.log(`[${new Date().toISOString()}] User transcript received:`, message.user_transcription_event.user_transcript);
          setIsAIPlaying(false);
        }

        if (message.type === "vad_score") {
          console.log(`[${new Date().toISOString()}] VAD score received:`, message.vad_score_event.score);
        }

        if (message.type === "error") {
          console.error(`[${new Date().toISOString()}] Server error:`, message.error_message);
        }

        if (message.type === "ping") {
          console.log(`[${new Date().toISOString()}] Ping received, sending pong`);
          websocketRef.current?.send(
            JSON.stringify({ type: "pong", event_id: message.ping_event.event_id })
          );
        }
      };

      websocketRef.current.onclose = (event) => {
        console.log(`[${new Date().toISOString()}] WebSocket disconnected`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setStatus("disconnected");
        setAudioStream(null);
        setIsUserSpeaking(false);
        setIsAIPlaying(false);
        setAIAudioElement(null);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error(`[${new Date().toISOString()}] WebSocket error:`, error);
        setStatus("disconnected");
        toast.error("Ошибка подключения к серверу. Проверьте agent_id или попробуйте позже.");
      };
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setStatus("disconnected");
      toast.error("Ошибка запуска сессии. Проверьте настройки и попробуйте снова.");
    }
  }, []);

  const endSession = useCallback(async () => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    audioProcessorRef.current();
    toast.loading("Анализируем диалог...");
    await analyzeConversation();
  }, [audioStream]);

  return {
    status,
    audioStream,
    isUserSpeaking,
    isAIPlaying,
    aiAudioElement,
    startSession,
    endSession,
    setIsUserSpeaking,
  };
}