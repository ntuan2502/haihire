import { lookup } from "node:dns";
import { BlockList, isIP, type LookupFunction } from "node:net";

export const publicAddressRequired =
  "Destination must resolve to a public address";

export const blockedAddresses = new BlockList();
export const globalIPv6 = new BlockList();
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

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedAddresses.check(address, "ipv4");
  return (
    family === 6 &&
    globalIPv6.check(address, "ipv6") &&
    !blockedAddresses.check(address, "ipv6")
  );
}

export function validatePublicHost(host: string): string | null {
  if (!host || !host.trim()) return "Host is required";
  const hostname = host.trim().replace(/^\[|\]$|\.$/g, "");
  if (isIP(hostname)) {
    return isPublicAddress(hostname) ? null : publicAddressRequired;
  }
  if (
    !hostname.includes(".") ||
    /\.(localhost|local|internal|home\.arpa)$/i.test(hostname) ||
    hostname.toLowerCase() === "localhost"
  ) {
    return publicAddressRequired;
  }
  return null;
}

export const lookupPublicAddress: LookupFunction = (
  hostname,
  options,
  callback,
) => {
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
