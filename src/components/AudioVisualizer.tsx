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

  // Порог амплитуды для распознавания речи
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

      // Определяем, говорит ли пользователь
      const isSpeaking = averageAmplitude > userSpeakingThreshold;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerY = canvas.height / 2;
      const centerX = canvas.width / 2;
      const barWidth = canvas.width / bufferLength;

      ctx.lineWidth = 2;
      ctx.strokeStyle = isSpeaking ? "rgb(59, 130, 246)" : "rgb(239, 68, 68)";
      ctx.fillStyle = isSpeaking
        ? "rgba(59, 130, 246, 0.3)"
        : "rgba(239, 68, 68, 0.3)";

      // Рисуем левую половину
      ctx.beginPath();
      for (let i = 0; i < bufferLength / 2; i++) {
        const normalizedIndex = i / (bufferLength / 2);
        const x = centerX + normalizedIndex * (canvas.width / 2);
        const amplitude = (dataArray[i] / 255) * (canvas.height / 2) * 1.2;
        const y = centerY + amplitude * Math.sin(normalizedIndex * Math.PI);

        if (i === 0) {
          ctx.moveTo(x, centerY);
        }

        if (i < bufferLength / 2 - 1) {
          const nextX = centerX + ((i + 1) / (bufferLength / 2)) * (canvas.width / 2);
          const nextAmplitude =
            (dataArray[i + 1] / 255) * (canvas.height / 2) * 1.2;
          const nextY =
            centerY + nextAmplitude * Math.sin(((i + 1) / (bufferLength / 2)) * Math.PI);
          const controlX = (x + nextX) / 2;
          const controlY = (y + nextY) / 2;
          ctx.quadraticCurveTo(controlX, controlY, nextX, nextY);
        }
      }

      // Рисуем правую половину (зеркалирование по горизонтали)
      for (let i = bufferLength / 2 - 1; i >= 0; i--) {
        const normalizedIndex = i / (bufferLength / 2);
        const x = centerX - normalizedIndex * (canvas.width / 2);
        const amplitude = (dataArray[i] / 255) * (canvas.height / 2) * 1.2;
        const y = centerY + amplitude * Math.sin(normalizedIndex * Math.PI);
        ctx.quadraticCurveTo(
          (x + (centerX - ((i - 1) / (bufferLength / 2)) * (canvas.width / 2))) / 2,
          (y + (centerY + amplitude * Math.sin(((i - 1) / (bufferLength / 2)) * Math.PI))) / 2,
          x,
          y
        );
      }

      ctx.lineTo(centerX, centerY);
      ctx.fill();
      ctx.stroke();

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
