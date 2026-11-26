import { APP_ERROR_CODES, type AiProvider } from "@haihire/shared";
import { AppBadRequestException } from "../common/app-exception";

const AI_REQUEST_TIMEOUT_MS = 20_000;

export interface AiPdfAttachment {
  base64: string;
  filename?: string;
}

export function providerSupportsPdfAttachment(provider: AiProvider): boolean {
  return (
    provider === "GEMINI" || provider === "ANTHROPIC" || provider === "OPENAI"
  );
}

const BLOCKED_METADATA_HOSTS = new Set([
  "169.254.169.254",
  "169.254.170.2",
  "100.100.100.200",
  "metadata.google.internal",
  "metadata.goog",
]);

export interface AiCompletionRequest {
  provider: AiProvider;
  modelId: string;
  apiKey?: string | null;
  baseUrl?: string | null;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
  pdfAttachment?: AiPdfAttachment;
}

export function assertSafeAiEndpointUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "Invalid AI provider base URL.",
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "AI provider base URL must use HTTP or HTTPS.",
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_METADATA_HOSTS.has(hostname) ||
    hostname.startsWith("169.254.") ||
    hostname === "0.0.0.0"
  ) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "Target AI endpoint host is not permitted.",
    );
  }

  return parsed;
}

function resolveOpenAiCompatibleBaseUrl(
  provider: AiProvider,
  customBaseUrl?: string | null,
): string {
  if (provider === "OPENAI") {
    return "https://api.openai.com/v1";
  }
  if (provider === "OPENROUTER") {
    return "https://openrouter.ai/api/v1";
  }
  if (!customBaseUrl) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "Base URL is required for OpenAI-Compatible providers.",
    );
  }
  const safe = assertSafeAiEndpointUrl(customBaseUrl);
  return safe.toString().replace(/\/+$/, "");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = AI_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_CONNECTION_FAILED,
        "AI provider request timed out.",
      );
    }
    throw new AppBadRequestException(
      APP_ERROR_CODES.AI_CONNECTION_FAILED,
      err instanceof Error ? err.message : "Failed to reach AI provider.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function extractProviderError(res: Response): Promise<string> {
  try {
    const bodyText = await res.text();
    if (!bodyText) return `HTTP ${res.status}`;
    try {
      const json = JSON.parse(bodyText) as {
        error?: { message?: string };
        message?: string;
      };
      return (
        json?.error?.message ||
        json?.message ||
        `HTTP ${res.status}: ${bodyText.slice(0, 200)}`
      );
    } catch {
      return `HTTP ${res.status}: ${bodyText.slice(0, 200)}`;
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function callAiCompletion(
  req: AiCompletionRequest,
): Promise<string> {
  const maxTokens = req.maxTokens ?? 2048;
  const temperature = req.temperature ?? 0.4;
  const timeoutMs = req.timeoutMs ?? AI_REQUEST_TIMEOUT_MS;

  if (req.provider === "GEMINI") {
    const apiKey = req.apiKey?.trim();
    if (!apiKey) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "Gemini API key is required.",
      );
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const userParts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];
    if (req.pdfAttachment?.base64) {
      userParts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: req.pdfAttachment.base64,
        },
      });
    }
    userParts.push({ text: req.userPrompt });

    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: req.systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: userParts,
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            ...(req.jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      const msg = await extractProviderError(response);
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_CONNECTION_FAILED,
        msg,
      );
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_GENERATION_FAILED,
        "Gemini returned an empty response.",
      );
    }
    return text;
  }

  if (req.provider === "ANTHROPIC") {
    const apiKey = req.apiKey?.trim();
    if (!apiKey) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "Anthropic API key is required.",
      );
    }
    const anthropicUserContent = req.pdfAttachment?.base64
      ? [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: req.pdfAttachment.base64,
            },
          },
          { type: "text", text: req.userPrompt },
        ]
      : req.userPrompt;

    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: req.modelId,
          max_tokens: maxTokens,
          temperature,
          system: req.systemPrompt,
          messages: [{ role: "user", content: anthropicUserContent }],
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      const msg = await extractProviderError(response);
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_CONNECTION_FAILED,
        msg,
      );
    }

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      payload.content
        ?.filter((block) => block.type === "text" && block.text)
        .map((block) => block.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_GENERATION_FAILED,
        "Anthropic returned an empty response.",
      );
    }
    return text;
  }

  // OPENAI, OPENROUTER, OPENAI_COMPATIBLE
  const baseUrl = resolveOpenAiCompatibleBaseUrl(req.provider, req.baseUrl);
  const apiKey = req.apiKey?.trim();
  if (req.provider !== "OPENAI_COMPATIBLE" && !apiKey) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.AI_NOT_CONFIGURED,
      `API key is required for ${req.provider}.`,
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const openAiUserContent =
    req.provider === "OPENAI" && req.pdfAttachment?.base64
      ? [
          {
            type: "file",
            file: {
              filename: req.pdfAttachment.filename || "resume.pdf",
              file_data: `data:application/pdf;base64,${req.pdfAttachment.base64}`,
            },
          },
          { type: "text", text: req.userPrompt },
        ]
      : req.userPrompt;

  const response = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: req.modelId,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: openAiUserContent },
        ],
        ...(req.jsonMode && req.provider === "OPENAI"
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    const msg = await extractProviderError(response);
    throw new AppBadRequestException(APP_ERROR_CODES.AI_CONNECTION_FAILED, msg);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.AI_GENERATION_FAILED,
      "AI provider returned an empty response.",
    );
  }
  return text;
}
