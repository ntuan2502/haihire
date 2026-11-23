import { request } from "node:https";
import { isIP } from "node:net";
import { createLookupPublicAddress, isPublicAddress } from "../network.util";
import type {
  WebhookProviderType,
  WebhookSendResult,
} from "./webhook-provider.interface";

const telegramUrl =
  /^https:\/\/api\.telegram\.org\/bot[a-zA-Z0-9:_-]+\/sendMessage$/;
const discordUrl =
  /^https:\/\/discord\.com\/api\/webhooks\/[0-9]+\/[a-zA-Z0-9:_-]+$/;
const publicAddressRequired =
  "Webhook destination must resolve to a public address";

function resolveDestination(
  provider: WebhookProviderType,
  input: string,
): URL | string {
  if (input.includes("***")) return "A complete webhook URL is required";
  if (provider === "TELEGRAM" && !telegramUrl.test(input)) {
    return "webhookUrl for Telegram must match https://api.telegram.org/bot<token>/sendMessage";
  }
  if (provider === "DISCORD" && !discordUrl.test(input)) {
    return "webhookUrl for Discord must match https://discord.com/api/webhooks/<id>/<token>";
  }
  if (
    provider !== "TELEGRAM" &&
    provider !== "DISCORD" &&
    provider !== "GENERIC"
  ) {
    return `Unsupported provider: ${provider}`;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "webhookUrl must be a valid URL";
  }
  if (url.protocol !== "https:")
    return "webhookUrl for Generic webhook must use HTTPS";
  if (url.username || url.password)
    return "Webhook URL must not include credentials";

  const hostname = url.hostname.replace(/^\[|\]$|\.$/g, "");
  if (isIP(hostname))
    return isPublicAddress(hostname) ? url : publicAddressRequired;
  if (
    !hostname.includes(".") ||
    /\.(localhost|local|internal|home\.arpa)$/.test(hostname)
  ) {
    return publicAddressRequired;
  }
  return url;
}

export function validateWebhookDestination(
  provider: WebhookProviderType,
  input: string,
): string | null {
  const destination = resolveDestination(provider, input);
  return typeof destination === "string" ? destination : null;
}

const lookupPublicAddress = createLookupPublicAddress(publicAddressRequired);

export async function postWebhook(
  provider: WebhookProviderType,
  input: string,
  body: string,
  headers: Record<string, string> = {},
): Promise<WebhookSendResult> {
  const destination = resolveDestination(provider, input);
  if (typeof destination === "string")
    return { success: false, errorMessage: destination };

  const signal = AbortSignal.timeout(5000);
  try {
    return await new Promise<WebhookSendResult>((resolve, reject) => {
      // A fresh connection runs our DNS lookup. Node HTTPS never follows redirects.
      const outbound = request(
        destination,
        {
          agent: false,
          lookup: lookupPublicAddress,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            ...headers,
          },
          signal,
        },
        (response) => {
          const statusCode = response.statusCode ?? 0;
          response.destroy();
          if (statusCode >= 200 && statusCode < 300) {
            resolve({ success: true, statusCode });
          } else {
            resolve({
              success: false,
              statusCode,
              errorMessage: `Webhook returned HTTP ${statusCode}`,
            });
          }
        },
      );
      outbound.on("error", reject);
      outbound.end(body);
    });
  } catch (error) {
    const errorMessage = signal.aborted
      ? "Webhook request timed out"
      : error instanceof Error && error.message === publicAddressRequired
        ? publicAddressRequired
        : "Webhook connection failed";
    return { success: false, errorMessage };
  }
}
