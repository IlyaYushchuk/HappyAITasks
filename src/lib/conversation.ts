// app/lib/conversation.ts
import toast from "react-hot-toast";
import type { TranscriptEntry } from "~/stores/useSettingsStore";

// Интерфейс для данных, возвращаемых fetchData
interface ConversationData {
  status?: string;
  transcript?: TranscriptEntry[];
}

// Интерфейс для данных анализа
interface AnalysisResponse {
  value: string; // JSON-строка, содержащая объект с полем values
}

// Интерфейс для результата JSON.parse(analysisData.value)
interface AnalysisValues {
  values: number[];
}

export const fetchData = async (conversationId: string): Promise<ConversationData> => {
  const response = await fetch(`/api/routes/conversation/${conversationId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetchData(conversationId);
  }

  const data: ConversationData = await response.json() as ConversationData;
  if (data.status === "processing") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetchData(conversationId);
  }
  console.log("Conversation analysis:", data);
  return data;
};

export const analyzeConversation = async (
  conversationId: string | null,
  setScoreArray: (array: number[]) => void,
  setTranscript: (transcript: TranscriptEntry[]) => void
) => {
  try {
    if (!conversationId) return;

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const data = await fetchData(conversationId);
    if (!data.transcript) return;

    setTranscript(data.transcript);

    const analysis = await fetch("/api/routes/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: JSON.stringify(data.transcript) }),
    });

    const analysisData: AnalysisResponse = await analysis.json() as AnalysisResponse;
    const parsedData: AnalysisValues = JSON.parse(analysisData.value) as AnalysisValues;
    const array = parsedData.values;
    toast.dismiss();
    toast.success("Диалог успешно проанализирован!");
    setScoreArray(array);
  } catch (error) {
    console.error("Failed to analyze conversation:", error);
    toast.error("Ошибка при анализе диалога.");
  }
};