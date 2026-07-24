import { NextResponse } from "next/server";
import { getStoryConfig } from "@/lib/ai/config";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import {
  buildStoryMessages,
  buildStreamStoryMessages,
  estimateMinutes,
  parseStoryResponse,
} from "@/lib/ai/story";

export const runtime = "nodejs";
// Allow enough time for the LLM call (incl. streaming) to complete on Vercel.
export const maxDuration = 30;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

// GET is a lightweight health probe so the UI can decide whether to show the
// "create a story" entry point.
export function GET() {
  const { configured, model } = getStoryConfig();
  return NextResponse.json({ ok: true, ready: configured, model });
}

export async function POST(req: Request) {
  const config = getStoryConfig();
  if (!config.configured) {
    return NextResponse.json(
      { ok: false, error: "Story generation is not available." },
      { status: 503 },
    );
  }

  if (!checkRateLimit(clientIp(req)).allowed) {
    return NextResponse.json(
      { ok: false, error: "Please wait a moment before generating another story." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const input = (body ?? {}) as {
    setting?: unknown;
    detail?: unknown;
    stream?: unknown;
  };
  const wantsStream = input.stream === true;
  const storyInput = {
    setting: typeof input.setting === "string" ? input.setting : "",
    detail: typeof input.detail === "string" ? input.detail : "",
  };

  if (wantsStream) {
    return streamStory(config, storyInput);
  }

  const { system, user } = buildStoryMessages(storyInput);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "The narrator is resting. Try again shortly." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const story = parseStoryResponse(content);
    if (!story) {
      return NextResponse.json(
        { ok: false, error: "Could not compose a calm story. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      story: {
        title: story.title,
        paragraphs: story.paragraphs,
        minutes: estimateMinutes(story.paragraphs),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "The narrator is resting. Try again shortly." },
      { status: 502 },
    );
  }
}

type StoryConfigLike = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

/**
 * Stream the story as plain text. We consume OpenAI's SSE upstream, extract the
 * content deltas, and re-emit them as a plain-text stream the client can render
 * progressively. On upstream failure we emit nothing and close with a 502 so
 * the client can fall back to the non-streaming path.
 */
async function streamStory(
  config: StoryConfigLike,
  storyInput: { setting: string; detail: string },
): Promise<Response> {
  const { system, user } = buildStreamStoryMessages(storyInput);

  const upstream = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.8,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    return new NextResponse("stream_unavailable", { status: 502 });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const out = new ReadableStream<Uint8Array>({
    async pull(controllerStream) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controllerStream.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            controllerStream.close();
            return;
          }
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controllerStream.enqueue(encoder.encode(delta));
          } catch {
            // Ignore keep-alive / non-JSON lines.
          }
        }
      } catch {
        controllerStream.close();
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new NextResponse(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
