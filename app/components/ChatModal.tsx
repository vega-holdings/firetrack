"use client";

import { useChat } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { MessageSquare, X, Paperclip, Send } from "lucide-react";
import { useChat as useVercelChat } from "ai/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function ChatModal() {
  const { isOpen, toggle } = useChat();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
  } = useVercelChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Hey I'm Virginia! I can help you analyze legislative documents. Upload a PDF or ask me a question about any bill in my database.",
      },
    ],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload file");

      const data = await response.json();
      append({
        role: "assistant",
        content: `I've processed the file "${file.name}". What would you like to know about it?`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      append({
        role: "assistant",
        content: "Sorry, I encountered an error uploading the file.",
      });
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={toggle}>
      <Dialog.Trigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-[400px] flex-col gap-4 bg-background p-6 shadow-lg animate-in slide-in-from-right">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
            Virginia
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-lg p-4",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 rounded-md border bg-background px-3 py-2"
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
