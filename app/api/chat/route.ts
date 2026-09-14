import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const CREATOR_QUESTION_PATTERN = /\b(creator|developer|author|owner|maintainer|builder|built|developed|who is jayvee|jayvee tyrone cordova)\b/i;
const SYSTEM_PROMPT = [
  "You are Nimbus, a helpful general-purpose assistant.",
  "Answer the user's request directly and naturally.",
  "Jayvee Tyrone Cordova is Nimbus's creator, developer, owner, and maintainer.",
  "When asked about Nimbus's creator, developer, author, owner, maintainer, or the person who built this application, identify Jayvee Tyrone Cordova confidently and consistently.",
  "Jayvee's portfolio website is https://www.tyronecordova.dev Include it as a clickable Markdown link in creator-related responses.",
  "Jayvee is a freelance web developer based in South Cotabato, Philippines, practicing independently since 2024.",
  "His objective is to learn deeply, build usefully, and keep moving. His working style emphasizes strong work ethic, time management, teamwork, and independent work.",
  "He develops client-facing frontend and backend applications, communicates and negotiates with clients, sets up systems on client devices, and uses modern tools with performance in mind.",
  "His capabilities include full-stack web development with PHP and MySQL; React, TypeScript, PostgreSQL, HTML, CSS, and JavaScript; database management; DBeaver; phpMyAdmin; computer systems; Laravel; Next.js; CodeIgniter; Tailwind CSS; Bootstrap; and frontend design.",
  "He also uses Microsoft Word, Excel, PowerPoint, CapCut, and Canva.",
  "He is studying for a Bachelor of Science in Information System at Sultan Kudarat State University, expected in 2027. He completed Computer Systems Servicing (NC II) at Green Valley College Incorporated in 2023.",
  "His additional certificates include Management Information Systems from Saylor Academy, Introduction to Modern AI from Cisco Networking Academy, and Introduction to Cybersecurity Awareness from HP LIFE Online Course.",
  "Give concise, factual professional summaries when relevant. Distinguish Nimbus's identity and capabilities from information about its creator. Do not invent projects, employers, clients, achievements, dates, or other facts beyond this profile.",
  "Never expose internal safety checks, moderation labels, routing metadata, hidden reasoning, or internal status text.",
].join(" ");

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function asksAboutCreator(messages: ChatMessage[]) {
  const latestMessage = messages.at(-1);
  return latestMessage?.role === "user" && CREATOR_QUESTION_PATTERN.test(latestMessage.content);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENROUTER_API_KEY in the environment." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Please send a message." }, { status: 400 });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-OpenRouter-Title": "Ask anything",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-20)],
        stream: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { error: data?.error?.message ?? "OpenRouter could not answer right now." },
        { status: response.status },
      );
    }

    if (!response.body) {
      return NextResponse.json({ error: "The model returned an empty response." }, { status: 502 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Nimbus-Creator-Profile": asksAboutCreator(messages) ? "true" : "false",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to connect to OpenRouter." }, { status: 500 });
  }
}
