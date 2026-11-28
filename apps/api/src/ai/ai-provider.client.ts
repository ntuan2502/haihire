import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  APP_ERROR_CODES,
  type AiProvider,
  type AppErrorCode,
} from "@haihire/shared";
import { AppBadRequestException } from "../common/app-exception";
import { isPublicAddress, validatePublicHost } from "../common/network.util";

const AI_REQUEST_TIMEOUT_MS = 20_000;

export interface AiPdfAttachment {
  base64: string;
  filename?: string;
}

export interface AiProviderErrorMeta {
  httpStatus?: number;
  retryable: boolean;
  isAuthError: boolean;
  isRateLimited: boolean;
}

export class AiProviderCallError extends AppBadRequestException {
  constructor(
    code: AppErrorCode,
    message: string,
    public readonly meta: AiProviderErrorMeta,
  ) {
    super(code, message);
  }
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

function getAllowedInternalAiHosts(): Set<string> {
  const raw = process.env.AI_ALLOWED_INTERNAL_HOSTS || "";
  return new Set(
    raw
      .split(",")
      .map((entry) =>
        entry
          .trim()
          .toLowerCase()
          .replace(/^\[|\]$|\.$/g, ""),
      )
      .filter(Boolean),
  );
}

function normalizeAiHostname(rawHostname: string): string {
  return rawHostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$|\.$/g, "");
}

function isMetadataOrUnspecifiedHost(hostname: string): boolean {
  if (
    BLOCKED_METADATA_HOSTS.has(hostname) ||
    hostname.startsWith("169.254.") ||
    hostname === "0.0.0.0" ||
    hostname === "::"
  ) {
    return true;
  }
  if (hostname.startsWith("::ffff:")) {
    const mappedIpv4 = hostname.slice("::ffff:".length);
    return (
      BLOCKED_METADATA_HOSTS.has(mappedIpv4) ||
      mappedIpv4.startsWith("169.254.") ||
      mappedIpv4 === "0.0.0.0"
    );
  }
  return false;
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

  if (parsed.username || parsed.password) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "AI provider base URL must not contain embedded credentials.",
    );
  }

  const hostname = normalizeAiHostname(parsed.hostname);
  if (!hostname || isMetadataOrUnspecifiedHost(hostname)) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "Target AI endpoint host is not permitted.",
    );
  }

  if (getAllowedInternalAiHosts().has(hostname)) {
    return parsed;
  }

  if (parsed.protocol !== "https:") {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "AI provider base URL must use HTTPS.",
    );
  }

  if (validatePublicHost(hostname) !== null) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "Target AI endpoint host is not permitted.",
    );
  }

  return parsed;
}

export async function assertResolvedPublicAiHost(
  rawHostname: string,
): Promise<void> {
  const hostname = normalizeAiHostname(rawHostname);
  if (!hostname || getAllowedInternalAiHosts().has(hostname)) {
    return;
  }
  if (isIP(hostname)) {
    if (!isPublicAddress(hostname)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Target AI endpoint host is not permitted.",
      );
    }
    return;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "Target AI endpoint host could not be resolved.",
    );
  }

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => !isPublicAddress(address))
  ) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "Target AI endpoint host resolves to a non-public address.",
    );
  }
}

function normalizeCustomBaseUrl(rawUrl: string): string {
  return assertSafeAiEndpointUrl(rawUrl).toString().replace(/\/+$/, "");
}

function resolveOpenAiCompatibleBaseUrl(
  provider: AiProvider,
  customBaseUrl?: string | null,
): string {
  const trimmed = customBaseUrl?.trim();
  if (trimmed) {
    return normalizeCustomBaseUrl(trimmed);
  }
  if (provider === "OPENAI") {
    return "https://api.openai.com/v1";
  }
  if (provider === "OPENROUTER") {
    return "https://openrouter.ai/api/v1";
  }
  throw new AppBadRequestException(
    APP_ERROR_CODES.VALIDATION_ERROR,
    "Base URL is required for OpenAI-Compatible providers.",
  );
}

function resolveGeminiGenerateUrl(
  modelId: string,
  apiKey: string,
  customBaseUrl?: string | null,
): string {
  const trimmed = customBaseUrl?.trim();
  let root = "https://generativelanguage.googleapis.com/v1beta";
  if (trimmed) {
    const clean = normalizeCustomBaseUrl(trimmed);
    root = /\/v1(?:beta)?$/i.test(clean) ? clean : `${clean}/v1beta`;
  }
  return `${root}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function resolveAnthropicMessagesUrl(customBaseUrl?: string | null): string {
  const trimmed = customBaseUrl?.trim();
  if (!trimmed) {
    return "https://api.anthropic.com/v1/messages";
  }
  const clean = normalizeCustomBaseUrl(trimmed);
  if (/\/v1\/messages$/i.test(clean)) {
    return clean;
  }
  return /\/v1$/i.test(clean) ? `${clean}/messages` : `${clean}/v1/messages`;
}

function classifyHttpStatus(status: number): AiProviderErrorMeta {
  const isRateLimited = status === 429;
  const isAuthError = status === 401 || status === 403;
  const retryable =
    isRateLimited ||
    isAuthError ||
    status === 402 ||
    status === 408 ||
    status >= 500;
  return {
    httpStatus: status,
    retryable,
    isAuthError,
    isRateLimited,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = AI_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const parsed = assertSafeAiEndpointUrl(url);
  if (process.env.NODE_ENV !== "test") {
    await assertResolvedPublicAiHost(parsed.hostname);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof AppBadRequestException) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiProviderCallError(
        APP_ERROR_CODES.AI_CONNECTION_FAILED,
        "AI provider request timed out.",
        { retryable: true, isAuthError: false, isRateLimited: false },
      );
    }
    throw new AiProviderCallError(
      APP_ERROR_CODES.AI_CONNECTION_FAILED,
      err instanceof Error ? err.message : "Failed to reach AI provider.",
      { retryable: true, isAuthError: false, isRateLimited: false },
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
      throw new AiProviderCallError(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "Gemini API key is required.",
        { retryable: false, isAuthError: true, isRateLimited: false },
      );
    }
    const endpoint = resolveGeminiGenerateUrl(req.modelId, apiKey, req.baseUrl);
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
      throw new AiProviderCallError(
        APP_ERROR_CODES.AI_CONNECTION_FAILED,
        msg,
        classifyHttpStatus(response.status),
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
      throw new AiProviderCallError(
        APP_ERROR_CODES.AI_GENERATION_FAILED,
        "Gemini returned an empty response.",
        { retryable: true, isAuthError: false, isRateLimited: false },
      );
    }
    return text;
  }

  if (req.provider === "ANTHROPIC") {
    const apiKey = req.apiKey?.trim();
    if (!apiKey) {
      throw new AiProviderCallError(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "Anthropic API key is required.",
        { retryable: false, isAuthError: true, isRateLimited: false },
      );
    }
    const endpoint = resolveAnthropicMessagesUrl(req.baseUrl);
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
      endpoint,
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
      throw new AiProviderCallError(
        APP_ERROR_CODES.AI_CONNECTION_FAILED,
        msg,
        classifyHttpStatus(response.status),
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
      throw new AiProviderCallError(
        APP_ERROR_CODES.AI_GENERATION_FAILED,
        "Anthropic returned an empty response.",
        { retryable: true, isAuthError: false, isRateLimited: false },
      );
    }
    return text;
  }

  // OPENAI, OPENROUTER, OPENAI_COMPATIBLE
  const baseUrl = resolveOpenAiCompatibleBaseUrl(req.provider, req.baseUrl);
  const apiKey = req.apiKey?.trim();
  if (req.provider !== "OPENAI_COMPATIBLE" && !apiKey) {
    throw new AiProviderCallError(
      APP_ERROR_CODES.AI_NOT_CONFIGURED,
      `API key is required for ${req.provider}.`,
      { retryable: false, isAuthError: true, isRateLimited: false },
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
    throw new AiProviderCallError(
      APP_ERROR_CODES.AI_CONNECTION_FAILED,
      msg,
      classifyHttpStatus(response.status),
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new AiProviderCallError(
      APP_ERROR_CODES.AI_GENERATION_FAILED,
      "AI provider returned an empty response.",
      { retryable: true, isAuthError: false, isRateLimited: false },
    );
  }
  return text;
}
