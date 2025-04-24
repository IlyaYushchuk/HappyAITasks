import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  stream: MediaStream | null;
  aiAudioElement: HTMLAudioElement | null;
  isUserSpeaking: boolean;
  isAIPlaying: boolean;
  onUserSpeakingChange: (isSpeaking: boolean) => void;
  className?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  stream,
  aiAudioElement,
  isUserSpeaking,
  isAIPlaying,
  onUserSpeakingChange,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserUserRef = useRef<AnalyserNode | null>(null);
  const analyserAIRef = useRef<AnalyserNode | null>(null);
  const sourceUserRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sourceAIRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Инициализация аудио (микрофон и ИИ)
  useEffect(() => {
    if (!stream || isInitializedRef.current) return;

    const initializeAudio = async () => {
      try {
        audioContextRef.current = new AudioContext(); // Убрали webkitAudioContext

        // Для пользователя (микрофон)
        analyserUserRef.current = audioContextRef.current.createAnalyser();
        analyserUserRef.current.fftSize = 256;
        sourceUserRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceUserRef.current.connect(analyserUserRef.current);

        // Для ИИ
        analyserAIRef.current = audioContextRef.current.createAnalyser();
        analyserAIRef.current.fftSize = 256;

        isInitializedRef.current = true;
      } catch (error) {
        console.error("Failed to initialize audio context:", error);
      }
    };

    initializeAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceUserRef.current) {
        sourceUserRef.current.mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Подключение аудиоэлемента ИИ
  useEffect(() => {
    if (!audioContextRef.current || !analyserAIRef.current || !aiAudioElement) return;

    if (sourceAIRef.current) {
      sourceAIRef.current.disconnect();
    }

    try {
      sourceAIRef.current = audioContextRef.current.createMediaElementSource(aiAudioElement);
      sourceAIRef.current.connect(analyserAIRef.current);
      analyserAIRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error("Failed to connect AI audio element:", error);
    }

    return () => {
      if (sourceAIRef.current) {
        sourceAIRef.current.disconnect();
        sourceAIRef.current = null;
      }
    };
  }, [aiAudioElement]);

  // Детекция речи пользователя
  useEffect(() => {
    if (!analyserUserRef.current || !isActive) return;

    const bufferLength = analyserUserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let speaking = false;

    const checkSpeaking = () => {
      analyserUserRef.current!.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const isSpeaking = average > 10;

      if (isSpeaking !== speaking) {
        speaking = isSpeaking;
        onUserSpeakingChange(isSpeaking);
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(checkSpeaking);
      }
    };

    checkSpeaking();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, onUserSpeakingChange]);

  // Отрисовка визуализации
  useEffect(() => {
    if (!canvasRef.current || !analyserUserRef.current || !analyserAIRef.current || !isInitializedRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyserUserRef.current.frequencyBinCount;
    const dataArrayUser = new Uint8Array(bufferLength);
    const dataArrayAI = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isActive || (!isUserSpeaking && !isAIPlaying)) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      animationRef.current = requestAnimationFrame(draw);

      // Выбираем источник данных
      const dataArray = isAIPlaying ? dataArrayAI : dataArrayUser;
      const analyser = isAIPlaying ? analyserAIRef.current! : analyserUserRef.current!;
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      // Устанавливаем цвет в зависимости от того, кто говорит
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (isAIPlaying) {
        gradient.addColorStop(0, "#ef4444"); // Красный (red-500)
        gradient.addColorStop(1, "#b91c1c"); // Темно-красный (red-700)
      } else {
        gradient.addColorStop(0, "#3b82f6"); // Синий (blue-500)
        gradient.addColorStop(1, "#1e40af"); // Темно-синий (blue-700)
      }

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, isUserSpeaking, isAIPlaying]);

  return <canvas ref={canvasRef} className={className} width={1024} height={96} />;
};

export default AudioVisualizer;