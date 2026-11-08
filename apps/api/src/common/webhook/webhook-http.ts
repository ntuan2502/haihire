import { lookup } from "node:dns";
import { request } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
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
const blockedAddresses = new BlockList();
const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");

// IANA special-purpose ranges and multicast. Exclude IPv6 transition prefixes.
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedAddresses.check(address, "ipv4");
  return (
    family === 6 &&
    globalIPv6.check(address, "ipv6") &&
    !blockedAddresses.check(address, "ipv6")
  );
}

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

const lookupPublicAddress: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, "");
    const first = addresses[0];
    if (!first || addresses.some(({ address }) => !isPublicAddress(address))) {
      return callback(new Error(publicAddressRequired), "");
    }
    // Return only the vetted DNS answers to this connection.
    if (options.all) return callback(null, addresses);
    callback(null, first.address, first.family);
  });
};

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
