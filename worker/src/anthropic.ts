// Minimal Anthropic Messages API client. Every call forces a single tool so
// the model's answer arrives as JSON matching the tool's input schema.
import type { Env } from "./http";

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 25_000;

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export class AnthropicError extends Error {
  constructor(
    readonly kind: "misconfigured" | "unavailable",
    readonly status?: number,
  ) {
    super(kind);
  }
}

/** Runs one forced tool call and returns the tool input the model produced. */
export async function callTool(
  env: Env,
  options: { system: string; user: string; tool: ToolSpec; maxTokens: number },
): Promise<Record<string, unknown>> {
  // Trim so a stray space or newline pasted with the secret does not break auth.
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new AnthropicError("misconfigured");

  let response: Response;
  try {
    response = await fetch(MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: options.maxTokens,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
        tools: [options.tool],
        tool_choice: { type: "tool", name: options.tool.name },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AnthropicError("unavailable");
  }

  if (!response.ok) {
    // Status only: the body can echo request content, which must not be logged.
    console.error(`anthropic status ${response.status}`);
    throw new AnthropicError(response.status === 401 ? "misconfigured" : "unavailable", response.status);
  }

  const body = (await response.json()) as {
    content?: { type: string; name?: string; input?: unknown }[];
  };
  const block = body.content?.find((item) => item.type === "tool_use" && item.name === options.tool.name);
  if (typeof block?.input !== "object" || block.input === null) throw new AnthropicError("unavailable");
  return block.input as Record<string, unknown>;
}
