/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useConversation } from "@11labs/react";
import { env } from "~/env";
import useSettingsStore from "~/stores/useSettingsStore";
import toast from "react-hot-toast";

export default function MicrophoneButton() {
  const { setScoreArray, setTranscript } = useSettingsStore();
  const [conversationId, setConversationId] = useState<string | null>(null);

  const fetchData = async () => {
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
      console.log(analysisData);
      const array = JSON.parse(analysisData.value).values;
      console.log(array);
      toast.dismiss();
      toast.success("Диалог успешно проанализирован!");
      setScoreArray(array);
    } catch (error) {
      console.error("Failed to analyze conversation:", error);
    }
  };

  const conversation = useConversation({
    onConnect: () => console.log("Connected"),
    onDisconnect: () => console.log("Disconnected"),
    onMessage: (message: any) => console.log("Message:", message),
    onError: (error: any) => console.error("Error:", error),
  });

  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const conversationId = await conversation.startSession({
        agentId: env.NEXT_PUBLIC_VOICE_AGENT_ID,
      });
      setConversationId(conversationId);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    toast.loading("Анализируем диалог...");
    await analyzeConversation();
  }, [conversation]);

  const handleClick = async () => {
    if (conversation.status == "disconnected") {
      await startConversation();
    }

    if (conversation.status == "connected") {
      await stopConversation();
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={`h-16 w-full rounded-lg text-lg font-semibold shadow-md transition-all duration-300 ${
        conversation.status == "connected"
          ? "border-none bg-red-600 hover:bg-red-700"
          : "border border-gray-200 bg-primary hover:bg-primary/90"
      } flex transform items-center justify-center space-x-2 text-primary-foreground`}
    >
      {conversation.status == "connecting" ? (
        <>
          <Loader2 className="mr-2 animate-spin" size={24} />
          <span>Подключение...</span>
        </>
      ) : conversation.status == "connected" ? (
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
  );
}
