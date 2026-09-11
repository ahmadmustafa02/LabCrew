/**
 * Free-first LLM client (OpenAI-compatible).
 * Set in .env:
 *   LLM_API_KEY=...          (required to enable)
 *   LLM_BASE_URL=https://api.groq.com/openai/v1   (default Groq)
 *   LLM_MODEL=openai/gpt-oss-20b                   (default; Groq retired llama-3.1-8b-instant)
 *
 * Without a key, agents keep using heuristics.
 */

export type LlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function llmConfigured() {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

export async function chatJson<T>(input: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ ok: true; data: T; model: string } | { ok: false; error: string }> {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "LLM_API_KEY not set" };
  }

  const baseUrl = (
    process.env.LLM_BASE_URL?.trim() || "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  const model =
    process.env.LLM_MODEL?.trim() || "openai/gpt-oss-20b";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: input.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: /json/i.test(input.system)
              ? input.system
              : `${input.system}\nReply with a JSON object.`,
          },
          { role: "user", content: input.user },
        ] as LlmChatMessage[],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: `LLM HTTP ${res.status}: ${text.slice(0, 240)}`,
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "Empty LLM response" };
    }

    const data = JSON.parse(content) as T;
    return { ok: true, data, model };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "LLM call failed",
    };
  }
}

export async function chatText(input: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "LLM_API_KEY not set" };
  }

  const baseUrl = (
    process.env.LLM_BASE_URL?.trim() || "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  const model =
    process.env.LLM_MODEL?.trim() || "openai/gpt-oss-20b";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: input.temperature ?? 0.4,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ] as LlmChatMessage[],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: `LLM HTTP ${res.status}: ${text.slice(0, 240)}`,
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "Empty LLM response" };
    }

    return { ok: true, text: content, model };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "LLM call failed",
    };
  }
}
