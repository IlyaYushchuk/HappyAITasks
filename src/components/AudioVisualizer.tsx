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
  const barCount = 50;
  // Скорость сглаживания (0.01 = максимально плавно)
  const smoothingFactor = 0.005;
  // Коэффициент масштабирования амплитуд
  const amplitudeScale = 1200;
  // Размер буфера данных (усредняем 12 кадров)
  const bufferSize = 12;

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
    aiBarHeightsRef.current = new Array<number>(barCount).fill(0);
    userBarHeightsRef.current = new Array<number>(barCount).fill(0);
    targetAiBarHeightsRef.current = new Array<number>(barCount).fill(0);
    targetUserBarHeightsRef.current = new Array<number>(barCount).fill(0);
    aiDataBufferRef.current = [];
    userDataBufferRef.current = [];

    // Функция для обработки аудиоданных с экспоненциальным сглаживанием
    const processAudioData = (
      data: Float32Array | null,
      buffer: Float32Array[],
      targetHeights: number[],
      isActive: boolean,
      label: string
    ) => {
      if (!isActive || !data || data.length === 0) {
        targetHeights.fill(0);
        buffer.length = 0;
        console.log(`[${new Date().toISOString()}] ${label}: Данные отсутствуют или неактивно`);
        return;
      }

      // Отладка: логируем первые 10 значений и состояние
      console.log(`[${new Date().toISOString()}] ${label}:`, data.slice(0, 10));
      console.log(`[${new Date().toISOString()}] ${label} isActive:`, isActive);

      // Добавляем данные в буфер
      buffer.push(new Float32Array(data));
      if (buffer.length > bufferSize) {
        buffer.shift();
      }

      // Экспоненциальное скользящее среднее
      const smoothedData = new Float32Array(data.length);
      const alpha = 0.1; // Вес новых данных (10%)
      if (buffer.length === 1) {
        smoothedData.set(data);
      } else {
        const prevData = buffer[buffer.length - 2] ?? data;
        for (let i = 0; i < data.length; i++) {
          const currentValue = data[i] ?? 0;
          smoothedData[i] = alpha * currentValue + (1 - alpha) * (prevData[i] ?? 0);
        }
      }

      // Берем подвыборку для столбцов
      const step = Math.floor(smoothedData.length / barCount);
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        const start = i * step;
        const end = Math.min(start + step, smoothedData.length);
        for (let j = start; j < end; j++) {
          const currentSmoothedData = smoothedData[j] ?? 0;
          sum += Math.abs(currentSmoothedData);
        }
        const avg = sum / (end - start);
        targetHeights[i] = avg * amplitudeScale; // Без ограничения высоты
      }
    };

    // Функция отрисовки гистограммы
    // Функция отрисовки гистограммы
    const draw = () => {
      if (!ctx || !canvas) return;

      // Очищаем Canvas
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const barWidth = (canvas.width / dpr / barCount) * 0.6; // Тонкие столбцы
      const gap = (canvas.width / dpr / barCount) * 0.4;

      // Обновляем целевые высоты
      processAudioData(
        aiAudioData,
        aiDataBufferRef.current,
        targetAiBarHeightsRef.current,
        isAIPlaying,
        "ИИ"
      );
      // Показываем гистограмму пользователя только если есть данные и ИИ не говорит
      processAudioData(
        userAudioData,
        userDataBufferRef.current,
        targetUserBarHeightsRef.current,
        !isAIPlaying && (userAudioData ? userAudioData.some((v) => Math.abs(v) > 0.0005) : false),
        "Пользователь"
      );

      // Отрисовываем гистограмму ИИ (красная)
      for (let i = 0; i < barCount; i++) {
        const currentAiHeight = aiBarHeightsRef.current[i] ?? 0;
        const targetAiHeight = targetAiBarHeightsRef.current[i] ?? 0;
        
        // Вычисляем новую высоту
        const newHeight = currentAiHeight + (targetAiHeight - currentAiHeight) * smoothingFactor;
        aiBarHeightsRef.current[i] = newHeight;
      
        // Рассчитываем позицию и размеры
        const x = i * (barWidth + gap);
        const y = canvas.height / dpr - newHeight;
        const height = Math.min(newHeight, canvas.height / dpr); // Ограничиваем верхом Canvas
      
        // Рисуем столбец
        ctx.fillStyle = "#dc2626"; // Красный для ИИ
        ctx.fillRect(x, y, barWidth, height);
      }

      // Отрисовываем гистограмму пользователя (синяя)
      for (let i = 0; i < barCount; i++) {
        // Защищенное получение значений (с заменой undefined на 0)
        const currentHeight = userBarHeightsRef.current[i] ?? 0;
        const targetHeight = targetUserBarHeightsRef.current[i] ?? 0;
        
        // Вычисление новой высоты
        const newHeight = currentHeight + (targetHeight - currentHeight) * smoothingFactor;
        userBarHeightsRef.current[i] = newHeight;
      
        // Расчет позиции и размеров
        const x = i * (barWidth + gap);
        const y = canvas.height / dpr - newHeight;
        const height = Math.min(newHeight, canvas.height / dpr);
      
        // Отрисовка столбца
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
      className="mt-4 mb-4 h-24 w-full rounded-md bg-transparent"
    />
  );
}