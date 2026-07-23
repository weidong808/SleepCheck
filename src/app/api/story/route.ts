import { NextResponse } from "next/server";
import { getStoryConfig } from "@/lib/ai/config";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import {
  buildStoryMessages,
  estimateMinutes,
  parseStoryResponse,
} from "@/lib/ai/story";

export const runtime = "nodejs";

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

  const input = (body ?? {}) as { setting?: unknown; detail?: unknown };
  const { system, user } = buildStoryMessages({
    setting: typeof input.setting === "string" ? input.setting : "",
    detail: typeof input.detail === "string" ? input.detail : "",
  });

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
