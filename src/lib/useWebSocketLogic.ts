/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useRef, useMemo } from "react";
import { env } from "~/env";
import useSettingsStore from "~/stores/useSettingsStore";
import type { TranscriptEntry } from "~/stores/useSettingsStore";
import toast from "react-hot-toast";

interface WebSocketLogic {
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

export function useWebSocketLogic(): WebSocketLogic {
  const { setScoreArray, setTranscript } = useSettingsStore();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [aiAudioData, setAIAudioData] = useState<Float32Array | null>(null);
  const [userAudioData, setUserAudioData] = useState<Float32Array | null>(null);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const websocketRef = useRef<WebSocket | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioProcessorRef = useRef<() => void>(() => {
    console.log('Audio processor not initialized yet');
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const lastAudioLogTimeRef = useRef(0);

  const toggleMicrophone = useCallback((enabled: boolean) => {
    if (audioStream) {
      audioStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      console.log(`[${new Date().toISOString()}] Микрофон ${enabled ? "включен" : "отключен"}`);
    }
  }, [audioStream]);

  const sendMicrophoneAudio = useCallback(async (stream: MediaStream) => {
    if (!websocketRef.current) return;

    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    analyserRef.current = audioContext.createAnalyser();
    analyserRef.current.fftSize = 4096; // Увеличиваем для лучшей чувствительности
    analyserRef.current.smoothingTimeConstant = 0.8; // Добавляем сглаживание
    source.connect(analyserRef.current);
    analyserRef.current.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (event) => {
      if (isAIPlaying) return;
      const inputBuffer = event.inputBuffer.getChannelData(0);
      const dataArray = new Float32Array(analyserRef.current!.frequencyBinCount);
      analyserRef.current!.getFloatTimeDomainData(dataArray);

      // Проверяем, есть ли ненулевые данные
      const hasData = dataArray.some((v) => Math.abs(v) > 0.001);
      if (hasData) {
        setUserAudioData(dataArray);
      } else {
        setUserAudioData(null);
      }

      const now = Date.now();
      if (now - lastAudioLogTimeRef.current >= 1000) {
        void (async () => {
          console.log(`[${new Date().toISOString()}] Отправлен аудиофрагмент пользователя`);
        })();
      }

      const binary = convertFloat32ToInt16(inputBuffer);
      const base64Audio = arrayBufferToBase64(binary);
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        void (async () => {
          try {
            void websocketRef.current?.send(JSON.stringify({ user_audio_chunk: base64Audio }));
          } catch (error) {
            console.error('Ошибка отправки аудио:', error);
          }
        })();
        if (now - lastAudioLogTimeRef.current >= 1000) {
          console.log(`[${new Date().toISOString()}] Отправлен аудиофрагмент пользователя`);
        }
      }
    };

    audioProcessorRef.current = () => {
      processor.disconnect();
      source.disconnect();
      analyserRef.current?.disconnect();
      audioContext.close();
    };
  }, [isAIPlaying, isUserSpeaking]);

  const convertFloat32ToInt16 = (buffer: Float32Array) => {
    if (!buffer) {
      console.error("Буфер не определён или пуст");
      return new ArrayBuffer(0);
    }
    const len = buffer.length;
    const result = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      const currentBufferElement = buffer[i] ?? 0;
      result[i] = Math.max(-32768, Math.min(32767, currentBufferElement * 32768));
    }
    return result.buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return window.btoa(binary);
  };

  const { playNextInQueue, playPcmAudio } = useMemo(() => {
    const playPcmAudio = (base64Audio: string) => {
      try {
        if (typeof globalThis.atob !== 'function') {
          throw new Error('atob is not available in this environment');
        }
        const audioData = globalThis.atob(base64Audio);
        const pcmData = new Int16Array(audioData.length / 2);
        
        for (let i = 0; i < audioData.length; i += 2) {
          pcmData[i / 2] = (audioData.charCodeAt(i + 1) << 8) | audioData.charCodeAt(i);
        }
  
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          floatData[i] = (pcmData[i] ?? 0) / 32768;
        }
  
        setAIAudioData(floatData);
  
        audioContextRef.current ??= new AudioContext({ sampleRate: 16000 });

        const audioBuffer = audioContextRef.current.createBuffer(1, floatData.length, 16000);
        audioBuffer.getChannelData(0).set(floatData);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
          console.log(`[${new Date().toISOString()}] Воспроизведение аудио ИИ завершено`);
          setIsAIPlaying(false);
          setAIAudioData(null);
          isPlayingQueueRef.current ??= false;
          void playNextInQueue();
        };
        
        source.start();
        setIsAIPlaying(true);
        toggleMicrophone(false);
        console.log(`[${new Date().toISOString()}] Воспроизведение аудио ИИ начато`);
      } catch (error) {
        console.error(`Ошибка воспроизведения:`, error);
        setIsAIPlaying(false);
        setAIAudioData(null);
        toggleMicrophone(true);
        isPlayingQueueRef.current = false;
        void playNextInQueue();
      }
    };
  
    const playNextInQueue = () => {
      if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) return;
      isPlayingQueueRef.current = true;
      const nextAudio = audioQueueRef.current.shift();
      if (nextAudio) {
        void playPcmAudio(nextAudio);
      } else {
        isPlayingQueueRef.current = false;
      }
    };
  
    return { playNextInQueue, playPcmAudio };
  }, [setAIAudioData, setIsAIPlaying, toggleMicrophone]);


  const fetchData = async () => {
    if (!conversationId) return { status: "error" };
    const response = await fetch(`/api/routes/conversation/${conversationId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      await new Promise((resolve) => { setTimeout(resolve, 1000); });
      return await fetchData();
    }

    const data = await response.json();
    if (data.status === "processing") {
      await new Promise((resolve) => { setTimeout(resolve, 1000); });
      return await fetchData();
    }
    console.log("Анализ разговора:", data);
    return data;
  };

  const analyzeConversation = useCallback(async () => {
    try {
      await new Promise((resolve) => { setTimeout(resolve, 1000); });
      const data = await fetchData();
      if (!data.transcript) return;

      const transcriptArray: TranscriptEntry[] = Array.isArray(data.transcript)
        ? data.transcript.map((item: any) => ({
            role: item.role === "ai" ? "agent" : item.role,
            message: item.message ?? String(item.text ?? ""),
            tool_calls: item.tool_calls ?? null,
            tool_results: item.tool_results ?? null,
            feedback: item.feedback ?? null,
            time_in_call_secs: item.time_in_call_secs ?? 0,
            conversation_turn_metrics: item.conversation_turn_metrics ?? null,
          }))
        : [
            {
              role: "unknown" as "agent" | "user",
              message: String(data.transcript),
              tool_calls: null,
              tool_results: null,
              feedback: null,
              time_in_call_secs: 0,
              conversation_turn_metrics: null,
            },
          ];
      setTranscript(transcriptArray);

      const analysis = await fetch("/api/routes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(transcriptArray) }),
      });

      const analysisData = await analysis.json();
      const array = JSON.parse(analysisData.value).values;
      toast.dismiss();
      toast.success("Диалог успешно проанализирован!");
      setScoreArray(array);
    } catch (error) {
      console.error("Ошибка анализа разговора:", error);
    }
  }, [conversationId, setScoreArray, setTranscript, fetchData]);

  const startSession = useCallback(async () => {
    try {
      setStatus("connecting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${env.NEXT_PUBLIC_VOICE_AGENT_ID}`;
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        console.log("Подключено с деталями:", {
          status: "connected",
          timestamp: new Date().toISOString(),
        });
        setStatus("connected");
        void sendMicrophoneAudio(stream);       
      };

      websocketRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("Сообщение:", {
          source: message.source ?? (message.type === "audio" ? "ai" : "unknown"),
          message: message,
          timestamp: new Date().toISOString(),
          rawMessage: message,
        });

        if (message.type === "conversation_initiation_metadata") {
          const newConversationId = message.conversation_initiation_metadata_event.conversation_id;
          setConversationId(newConversationId);
          console.log(`[${new Date().toISOString()}] ID разговора: ${newConversationId}`);
        }

        if (message.type === "audio") {
          setIsUserSpeaking(false);
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

          if (message.audio_event?.audio_base_64) {
            audioQueueRef.current.push(message.audio_event.audio_base_64);
            void playNextInQueue();
          }

          if (message.audio_event?.isFinal) {
            console.log(`[${new Date().toISOString()}] Аудиопоток ИИ завершён (isFinal)`);
            toggleMicrophone(true);
          } else {
            silenceTimeoutRef.current = setTimeout(() => {
              if (isAIPlaying && audioQueueRef.current.length === 0) {
                console.log(`[${new Date().toISOString()}] Аудиопоток ИИ завершён (тишина)`);
                setIsAIPlaying(false);
                setAIAudioData(null);
                toggleMicrophone(true);
              }
            }, 1000);
          }
        }

        if (message.type === "user_transcript") {
          console.log(`[${new Date().toISOString()}] Транскрипция пользователя:`, message.user_transcription_event.user_transcript);
          setIsUserSpeaking(true);
          setIsAIPlaying(false);
          
          const newEntry: TranscriptEntry = {
            role: "user",
            message: message.user_transcription_event.user_transcript,
            tool_calls: null,
            tool_results: null,
            feedback: null,
            time_in_call_secs: 0,
            conversation_turn_metrics: null,
          };
          const updatedTranscript = [...message.user_transcription_event.user_transcript, newEntry];
          setTranscript(updatedTranscript);
        }

        if (message.type === "ai_transcript") {
          console.log(`[${new Date().toISOString()}] Транскрипция ИИ:`, message.ai_transcription_event.ai_transcript);
          setIsUserSpeaking(false);
          
          const newEntry: TranscriptEntry = {
            role: "agent",
            message: message.ai_transcription_event.ai_transcript,
            tool_calls: null,
            tool_results: null,
            feedback: null,
            time_in_call_secs: 0,
            conversation_turn_metrics: null,
          };
          
          const updatedTranscript = [...message.ai_transcription_event.ai_transcript, newEntry];
          setTranscript(updatedTranscript);
        }

        if (message.type === "vad_score") {
          console.log(`[${new Date().toISOString()}] VAD-оценка:`, message.vad_score_event.score);
          // Понижаем порог для большей отзывчивости
          setIsUserSpeaking(message.vad_score_event.score > 0.3);
        }

        if (message.type === "error") {
          console.error("Ошибка:", {
            error: message.error_message,
            timestamp: new Date().toISOString(),
          });
        }

        if (message.type === "ping") {
          console.log(`[${new Date().toISOString()}] Получен ping, отправляем pong`);
          void (async () => {
            try {
              void websocketRef.current?.send(JSON.stringify({ type: "pong", event_id: message.ping_event.event_id }));
            } catch (error) {
              console.error('Ошибка отправки pong:', error);
            }
          })();
        }
      };

      websocketRef.current.onclose = (event) => {
        console.log("Отключено:", {
          timestamp: new Date().toISOString(),
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setStatus("disconnected");
        setAudioStream(null);
        setIsUserSpeaking(false);
        setIsAIPlaying(false);
        setAIAudioData(null);
        setUserAudioData(null);
        audioQueueRef.current = [];
        isPlayingQueueRef.current = false;
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error("Ошибка:", {
          error,
          timestamp: new Date().toISOString(),
        });
        setStatus("disconnected");
        toast.error("Ошибка подключения к серверу. Проверьте agent_id или попробуйте позже.");
      };
    } catch (error) {
      console.error("Ошибка запуска разговора:", error);
      setStatus("disconnected");
      toast.error("Ошибка запуска сессии. Проверьте настройки и попробуйте снова.");
    }
  }, [isAIPlaying, playNextInQueue, sendMicrophoneAudio, setTranscript, toggleMicrophone]);

  const endSession = useCallback(async () => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    audioProcessorRef.current();
    toast.loading("Анализируем диалог...");
    try {
      await analyzeConversation();
    } catch (error) {
      console.error('Ошибка анализа разговора:', error);
      toast.error('Не удалось проанализировать диалог');
    }
  }, [audioStream, analyzeConversation]);

  return {
    status,
    audioStream,
    isUserSpeaking,
    isAIPlaying,
    aiAudioData,
    userAudioData,
    startSession,
    endSession,
    setIsUserSpeaking,
  };
}