// app/lib/conversation.ts
/* eslint-disable */
import toast from "react-hot-toast";

export const fetchData = async (conversationId: string): Promise<any> => {
  const response = await fetch(`/api/routes/conversation/${conversationId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetchData(conversationId);
  }

  const data = await response.json();
  if (data.status === "processing") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetchData(conversationId);
  }
  console.log("Conversation analysis:", data);
  return data;
};

export const analyzeConversation = async (
  conversationId: string | null,
  setScoreArray: (array: any[]) => void,
  setTranscript: (transcript: any) => void
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

    const analysisData = await analysis.json();
    const array = JSON.parse(analysisData.value).values;
    toast.dismiss();
    toast.success("Диалог успешно проанализирован!");
    setScoreArray(array);
  } catch (error) {
    console.error("Failed to analyze conversation:", error);
    toast.error("Ошибка при анализе диалога.");
  }
};
/* eslint-enable */