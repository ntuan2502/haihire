import { lookup, type LookupAddress } from "node:dns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPublicAddress,
  lookupPublicAddress,
  validatePublicHost,
} from "./network.util";

vi.mock("node:dns", () => ({ lookup: vi.fn() }));

const lookupAll = vi.mocked(
  lookup as (
    hostname: string,
    options: { all: true },
    callback: (
      error: NodeJS.ErrnoException | null,
      addresses: LookupAddress[],
    ) => void,
  ) => void,
);

describe("network.util", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isPublicAddress", () => {
    it("rejects IPv4 loopback, private, and link-local metadata addresses", () => {
      expect(isPublicAddress("127.0.0.1")).toBe(false);
      expect(isPublicAddress("127.0.1.1")).toBe(false);
      expect(isPublicAddress("10.0.0.1")).toBe(false);
      expect(isPublicAddress("172.16.0.1")).toBe(false);
      expect(isPublicAddress("172.31.255.255")).toBe(false);
      expect(isPublicAddress("192.168.1.1")).toBe(false);
      expect(isPublicAddress("169.254.169.254")).toBe(false);
      expect(isPublicAddress("0.0.0.0")).toBe(false);
    });

    it("rejects IPv6 loopback, private, and documentation addresses", () => {
      expect(isPublicAddress("::1")).toBe(false);
      expect(isPublicAddress("fc00::1")).toBe(false);
      expect(isPublicAddress("fd00::1")).toBe(false);
      expect(isPublicAddress("fe80::1")).toBe(false);
      expect(isPublicAddress("2001:db8::1")).toBe(false);
    });

    it("accepts valid public IPv4 and IPv6 addresses", () => {
      expect(isPublicAddress("1.1.1.1")).toBe(true);
      expect(isPublicAddress("8.8.8.8")).toBe(true);
      expect(isPublicAddress("142.250.190.46")).toBe(true);
      expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    });
  });

  describe("validatePublicHost", () => {
    it("rejects localhost and non-FQDN hostnames", () => {
      expect(validatePublicHost("localhost")).toContain(
        "Destination must resolve to a public address",
      );
      expect(validatePublicHost("myserver")).toContain(
        "Destination must resolve to a public address",
      );
      expect(validatePublicHost("db.local")).toContain(
        "Destination must resolve to a public address",
      );
      expect(validatePublicHost("app.internal")).toContain(
        "Destination must resolve to a public address",
      );
    });

    it("rejects literal private and loopback IP hostnames", () => {
      expect(validatePublicHost("127.0.0.1")).toContain(
        "Destination must resolve to a public address",
      );
      expect(validatePublicHost("169.254.169.254")).toContain(
        "Destination must resolve to a public address",
      );
      expect(validatePublicHost("[::1]")).toContain(
        "Destination must resolve to a public address",
      );
    });

    it("accepts valid public domain names and public IPs", () => {
      expect(validatePublicHost("smtp.sendgrid.net")).toBeNull();
      expect(validatePublicHost("smtp.gmail.com")).toBeNull();
      expect(validatePublicHost("mail.haihire.com")).toBeNull();
      expect(validatePublicHost("1.1.1.1")).toBeNull();
    });
  });

  describe("lookupPublicAddress", () => {
    it("rejects DNS answers containing private addresses", () => {
      lookupAll.mockImplementation((_hostname, _options, callback) => {
        callback(null, [
          { address: "1.1.1.1", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ]);
      });

      const cb = vi.fn();
      lookupPublicAddress("smtp.evil.com", { all: true } as never, cb);

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Destination must resolve to a public address",
        }),
        "",
      );
    });

    it("accepts DNS answers with only public addresses", () => {
      const addresses: LookupAddress[] = [
        { address: "142.250.190.46", family: 4 },
      ];
      lookupAll.mockImplementation((_hostname, _options, callback) => {
        callback(null, addresses);
      });

      const cb = vi.fn();
      lookupPublicAddress("smtp.gmail.com", { all: true } as never, cb);

      expect(cb).toHaveBeenCalledWith(null, addresses);
    });
  });
});
