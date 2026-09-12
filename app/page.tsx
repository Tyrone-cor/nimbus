"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const starterPrompts = [
  "Explain a difficult idea simply",
  "Help me plan my next project",
  "Give me three creative directions",
];

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function ThemeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className="moon-icon" d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />
      <path className="sun-icon" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      <circle className="sun-icon" cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("nimbus-theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : systemTheme;
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 180 ? "auto" : "hidden";
  }, [input]);

  useEffect(() => {
    if (messages.length === 0) textareaRef.current?.focus();
  }, [messages.length]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  function appendAssistantDelta(delta: string) {
    setMessages((current) => {
      const nextMessages = [...current];
      const lastMessage = nextMessages.at(-1);

      if (lastMessage?.role === "assistant") {
        nextMessages[nextMessages.length - 1] = { ...lastMessage, content: lastMessage.content + delta };
      }

      return nextMessages;
    });
  }

  function processStreamEvent(event: string) {
    const payload = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!payload || payload === "[DONE]") return;

    try {
      const data = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
      const delta = data.choices?.[0]?.delta?.content;
      if (typeof delta === "string") appendAssistantDelta(delta);
    } catch {
      // Ignore OpenRouter keep-alives and non-content stream events.
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Something went wrong.");
      }
      if (!response.body) throw new Error("The assistant returned an empty response.");

      setMessages((current) => [...current, { role: "assistant", content: "" }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        events.forEach(processStreamEvent);
      }

      buffer += decoder.decode();
      if (buffer.trim()) processStreamEvent(buffer);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reach the assistant.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="chat-app">
      <header className="chat-header">
        <button className="wordmark" type="button" onClick={() => { setMessages([]); setError(""); }} aria-label="Start a new conversation">
          <span className="wordmark-symbol" aria-hidden="true">✦</span>
          Nimbus
        </button>
        <div className="header-actions">
          <button className="theme-toggle" type="button" onClick={() => {
            const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
            document.documentElement.dataset.theme = nextTheme;
            window.localStorage.setItem("nimbus-theme", nextTheme);
          }} aria-label="Toggle dark mode" title="Toggle dark mode"><ThemeIcon /></button>
          {messages.length > 0 && <button className="new-chat" type="button" onClick={() => { setMessages([]); setInput(""); setError(""); }}>New chat</button>}
        </div>
      </header>

      <section className="conversation-scroll" ref={messagesRef} aria-live="polite">
        {messages.length === 0 ? (
          <div className="welcome">
            <h1>How can I help you today?</h1>
            <div className="prompt-grid">
              {starterPrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => setInput(prompt)}>{prompt}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                {message.role === "assistant" ? (
                  <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{message.content}</ReactMarkdown></div>
                ) : <p>{message.content}</p>}
              </article>
            ))}
            {isLoading && <article className="message assistant loading-message" aria-label="Nimbus is thinking"><span /><span /><span /></article>}
          </div>
        )}
      </section>

      <div className="composer-dock">
        <div className="composer-container">
          {error && <p className="error-message" role="alert">{error}</p>}
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Message Nimbus"
              aria-label="Message Nimbus"
              rows={1}
            />
            <button className="send-button" type="submit" disabled={!input.trim() || isLoading} aria-label="Send message"><SendIcon /></button>
          </form>
          <p className="composer-note">Nimbus can make mistakes. Check important information.</p>
        </div>
      </div>
    </main>
  );
}
