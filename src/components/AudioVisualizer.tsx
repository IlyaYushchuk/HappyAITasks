import { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  stream: MediaStream | null;
  isUserSpeaking: boolean;
  className?: string;
}

export function AudioVisualizer({
  isActive,
  stream,
  isUserSpeaking,
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const [amplitude, setAmplitude] = useState(0);
  const prevAmplitudes = useRef<number[]>([]); // Для сглаживания

  const userSpeakingThreshold = 40;

  useEffect(() => {
    if (!isActive || !stream) return;

    const context = new AudioContext();
    const analyserNode = context.createAnalyser();
    analyserNode.fftSize = 256;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyserNode);
    audioContextRef.current = context;
    analyserRef.current = analyserNode;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isActive) return;

      analyserNode.getByteFrequencyData(dataArray);

      let totalAmplitude = 0;
      for (let i = 0; i < bufferLength; i++) {
        totalAmplitude += dataArray[i];
      }

      const averageAmplitude = totalAmplitude / bufferLength;
      setAmplitude(averageAmplitude);

      const isSpeaking = averageAmplitude > userSpeakingThreshold;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.fillStyle = isSpeaking
        ? "rgba(59, 130, 246, 0.7)"
        : "rgba(239, 68, 68, 0.7)";

      // Сглаживание амплитуд
      prevAmplitudes.current.push(averageAmplitude);
      if (prevAmplitudes.current.length > 5) prevAmplitudes.current.shift();
      const smoothedAmplitude =
        prevAmplitudes.current.reduce((a, b) => a + b, 0) / prevAmplitudes.current.length;

      // Подготовка данных для столбцов
      const barWidth = canvas.width / bufferLength;
      const waveData = new Array(bufferLength).fill(0);
      for (let i = 0; i < bufferLength; i++) {
        waveData[i] = (dataArray[i] / 255) * (canvas.height / 2) * 1.5 * (smoothedAmplitude / 100);
      }

      // Рисуем столбцы
      for (let i = 0; i < bufferLength; i++) {
        const normalizedIndex = (i - bufferLength / 2) / (bufferLength / 2); 
        // Высота максимальна в центре
        const height = waveData[i] * Math.cos(normalizedIndex * (Math.PI / 2));
        const x = i * barWidth;

        // Верхняя половина (от центра вверх)
        ctx.fillRect(x, centerY - height, barWidth, height);

        // Нижняя половина (от центра вниз, симметрично)
        ctx.fillRect(x, centerY, barWidth, height);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameRef.current!);
      source.disconnect();
      context.close();
    };
  }, [isActive, stream]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={800}
      height={100}
    />
  );
}