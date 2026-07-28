/**
 * LLM client for report prose — NVIDIA NIM (OpenAI-compatible), same
 * provider and free key as the main name.ai app's free_tools/server/llm.js.
 * Plain fetch, no SDK — mirrors that client's shape (env vars, error
 * classification) without its Redis spend-accounting, which this project
 * doesn't have infrastructure for.
 */

const NVIDIA_BASE = (process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
const DEFAULT_MODEL = process.env.TOOLS_LLM_MODEL || "meta/llama-3.1-8b-instruct";

export class LlmError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "LlmError";
    this.code = code;
  }
}

function getApiKey(): string {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new LlmError("llm_not_configured", "NVIDIA_API_KEY is not set.");
  }
  return apiKey;
}

export interface CompletionResult {
  text: string;
  usage: { prompt_tokens?: number; completion_tokens?: number } | null;
  model: string;
}

export async function completeText({
  system,
  user,
  model = DEFAULT_MODEL,
  maxTokens = 700,
  temperature = 0.5,
}: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<CompletionResult> {
  const apiKey = getApiKey();

  let res: Response;
  try {
    res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (err) {
    throw new LlmError(
      "llm_error",
      `Could not reach NVIDIA NIM: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const bodyText = await res.text();
  let body: { choices?: Array<{ message?: { content?: string } }>; usage?: unknown; error?: { message?: string } } | null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errMsg = body?.error?.message || bodyText.slice(0, 300) || res.statusText;
    if (/401|403|unauthorized|invalid.*key|api.?key/i.test(errMsg)) {
      throw new LlmError("llm_not_configured", "NVIDIA API key was rejected.");
    }
    if (/credit|billing|quota|insufficient/i.test(errMsg)) {
      throw new LlmError("llm_unavailable", "NVIDIA NIM quota/credits exhausted.");
    }
    if (/rate.?limit|429/i.test(errMsg)) {
      throw new LlmError("llm_rate_limited", "NVIDIA NIM rate limited this request.");
    }
    throw new LlmError("llm_error", `NVIDIA NIM request failed: ${errMsg}`);
  }

  const content = body?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content.trim() : "";
  if (!text) {
    throw new LlmError("llm_empty", "NVIDIA NIM returned an empty completion.");
  }

  return { text, usage: (body?.usage as CompletionResult["usage"]) ?? null, model };
}
