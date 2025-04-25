/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import TextareaAutosize from "react-textarea-autosize"; // Auto-resizing textarea
import { env } from "~/env";

export default function SettingsModal({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [firstMessage, setFirstMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch agent data when the modal is opened.
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${env.NEXT_PUBLIC_VOICE_AGENT_ID}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
          },
        },
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // Assuming the data structure is:
          // { conversation_config: { agent: { first_message: string, prompt: { prompt: string } } } }
          const agent = data.conversation_config?.agent;
          setFirstMessage(agent?.first_message ?? "");
          setSystemPrompt(agent?.prompt?.prompt ?? "");
        })
        .catch((error) => {
          console.error("Error fetching agent data:", error);
          toast.error("Ошибка при загрузке настроек агента!");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open]);

  const handleSave = async () => {
    try {
      toast.loading("Сохранение настроек...");
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${env.NEXT_PUBLIC_VOICE_AGENT_ID}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            conversation_config: {
              agent: {
                first_message: firstMessage,
                prompt: {
                  prompt: systemPrompt,
                },
              },
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);
      toast.dismiss();
      toast.success("Настройки сохранены!");
      setOpen(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.dismiss();
      toast.error("Ошибка при сохранении настроек!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
          <DialogDescription>
            Настройте первое сообщение и системный промпт здесь. Нажмите
            «Сохранить», когда закончите.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first-message" className="text-right">
              Первое сообщение
            </Label>
            <Input
              id="first-message"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
          {/* System Prompt Auto-Resizing Textarea */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="system-prompt" className="text-right">
              Системный промпт
            </Label>
            <TextareaAutosize
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="col-span-3 block w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              disabled={isLoading}
              minRows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={isLoading}>
            Сохранить изменения
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
