"use client";

import { useEffect, useRef } from "react";

interface VoiceVisualizerProps {
  userAudioData: Float32Array | null; // Данные аудио пользователя
  aiAudioData: Float32Array | null; // Данные аудио ИИ
  isUserSpeaking: boolean; // Флаг речи пользователя
  isAIPlaying: boolean; // Флаг воспроизведения ИИ
}

export default function VoiceVisualizer({
  userAudioData,
  aiAudioData,
  isUserSpeaking,
  isAIPlaying,
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const aiBarHeightsRef = useRef<number[]>([]); // Текущие высоты столбцов ИИ
  const userBarHeightsRef = useRef<number[]>([]); // Текущие высоты столбцов пользователя
  const targetAiBarHeightsRef = useRef<number[]>([]); // Целевые высоты ИИ
  const targetUserBarHeightsRef = useRef<number[]>([]); // Целевые высоты пользователя
  const aiDataBufferRef = useRef<Float32Array[]>([]); // Буфер последних данных ИИ
  const userDataBufferRef = useRef<Float32Array[]>([]); // Буфер последних данных пользователя

  // Количество столбцов
  const barCount = 20;
  // Скорость сглаживания (0.03 = очень плавно)
  const smoothingFactor = 0.03;
  // Коэффициент масштабирования амплитуд
  const amplitudeScale = 800;
  // Размер буфера данных (усредняем 5 последних кадров)
  const bufferSize = 5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Настраиваем Canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    // Инициализируем массивы высот
    aiBarHeightsRef.current = new Array(barCount).fill(0);
    userBarHeightsRef.current = new Array(barCount).fill(0);
    targetAiBarHeightsRef.current = new Array(barCount).fill(0);
    targetUserBarHeightsRef.current = new Array(barCount).fill(0);
    aiDataBufferRef.current = [];
    userDataBufferRef.current = [];

    // Функция для обработки и нормализации аудиоданных
    const processAudioData = (
      data: Float32Array | null,
      buffer: Float32Array[],
      targetHeights: number[],
      isActive: boolean,
      label: string
    ) => {
      if (!isActive || !data || data.length === 0) {
        targetHeights.fill(0);
        buffer.length = 0; // Очищаем буфер
        console.log(`[${new Date().toISOString()}] ${label}: Данные отсутствуют или неактивно`);
        return;
      }

      // Отладка: логируем первые 10 значений
      console.log(`[${new Date().toISOString()}] ${label}:`, data.slice(0, 10));

      // Добавляем данные в буфер
      buffer.push(new Float32Array(data));
      if (buffer.length > bufferSize) {
        buffer.shift(); // Удаляем старые данные
      }

      // Усредняем данные из буфера
      const smoothedData = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;
        for (const frame of buffer) {
          if (i < frame.length) {
            sum += frame[i];
            count++;
          }
        }
        smoothedData[i] = count > 0 ? sum / count : data[i];
      }

      // Берем подвыборку для столбцов
      const step = Math.floor(smoothedData.length / barCount);
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        const start = i * step;
        const end = Math.min(start + step, smoothedData.length);
        for (let j = start; j < end; j++) {
          sum += Math.abs(smoothedData[j]);
        }
        const avg = sum / (end - start);
        targetHeights[i] = Math.min(avg * amplitudeScale, canvas.height / 2 / dpr);
      }
    };

    // Функция отрисовки гистограммы
    const draw = () => {
      if (!ctx || !canvas) return;

      // Очищаем Canvas
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const barWidth = (canvas.width / dpr / barCount) * 0.8;
      const gap = (canvas.width / dpr / barCount) * 0.2;

      // Обновляем целевые высоты
      processAudioData(
        aiAudioData,
        aiDataBufferRef.current,
        targetAiBarHeightsRef.current,
        isAIPlaying,
        "ИИ"
      );
      processAudioData(
        userAudioData,
        userDataBufferRef.current,
        targetUserBarHeightsRef.current,
        isUserSpeaking || userAudioData?.some((v) => Math.abs(v) > 0.001), // Включаем, если есть данные
        "Пользователь"
      );

      // Отрисовываем гистограмму ИИ (красная)
      for (let i = 0; i < barCount; i++) {
        aiBarHeightsRef.current[i] +=
          (targetAiBarHeightsRef.current[i] - aiBarHeightsRef.current[i]) * smoothingFactor;

        const x = i * (barWidth + gap);
        const y = (canvas.height / dpr - aiBarHeightsRef.current[i]) / 2;
        const height = aiBarHeightsRef.current[i];

        ctx.fillStyle = "#dc2626"; // Красный для ИИ
        ctx.fillRect(x, y, barWidth, height);
      }

      // Отрисовываем гистограмму пользователя (синяя)
      for (let i = 0; i < barCount; i++) {
        userBarHeightsRef.current[i] +=
          (targetUserBarHeightsRef.current[i] - userBarHeightsRef.current[i]) * smoothingFactor;

        const x = i * (barWidth + gap);
        const y = (canvas.height / dpr - userBarHeightsRef.current[i]) / 2;
        const height = userBarHeightsRef.current[i];

        ctx.fillStyle = "#2563eb"; // Синий для пользователя
        ctx.fillRect(x, y, barWidth, height);
      }

      // Продолжаем анимацию
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Запускаем анимацию
    animationFrameRef.current = requestAnimationFrame(draw);

    // Очистка
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [aiAudioData, userAudioData, isAIPlaying, isUserSpeaking]);

  return (
    <canvas
      ref={canvasRef}
      className="mt-4 h-24 w-full max-w-[300px] rounded-md bg-gray-100"
    />
  );
}