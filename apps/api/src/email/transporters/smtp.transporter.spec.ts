import { EventEmitter } from "node:events";
import { lookup, type LookupAddress } from "node:dns";
import { createConnection, type NetConnectOpts, type LookupFunction } from "node:net";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SmtpTransporter } from "./smtp.transporter";
import { lookupPublicAddress } from "../../common/network.util";

type LookupAll = (host: string, options: { all: true }, callback: (error: Error | null, addresses: LookupAddress[]) => void) => void;

vi.mock("node:dns", () => ({ lookup: vi.fn() }));
vi.mock("node:net", async (importOriginal) => ({
  ...await importOriginal<typeof import("node:net")>(),
  createConnection: vi.fn(),
}));
vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));

describe("SMTP destination validation on the actual socket", () => {
  let options: SMTPTransport.Options;
  const payload = { from: "from@example.com", to: "to@example.com", subject: "Test", html: "Hello" };
  const configure = (port = 587) => new SmtpTransporter({
    provider: "SMTP", fromName: "Test", fromEmail: payload.from,
    smtpHost: "smtp.example.com", smtpPort: port,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nodemailer.createTransport).mockImplementation(((config: SMTPTransport.Options) => {
      options = config;
      return {
        sendMail: () => new Promise((resolve, reject) => {
          config.getSocket!(config, (error, result) => {
            if (error) reject(error);
            else if (result && result.connection) resolve({ messageId: "sent" });
            else reject(new Error("Missing socket"));
          });
        }),
      };
    }) as unknown as typeof nodemailer.createTransport);
    vi.mocked(createConnection).mockImplementation(((connectionOptions: NetConnectOpts & { lookup: LookupFunction }) => {
      const socket = new EventEmitter() as EventEmitter & {
        setTimeout: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      socket.setTimeout = vi.fn();
      socket.destroy = vi.fn();
      queueMicrotask(() => connectionOptions.lookup("smtp.example.com", {}, (error) => {
        socket.emit(error ? "error" : "connect", error);
      }));
      return socket;
    }) as unknown as typeof createConnection);
  });

  it("rejects DNS that resolves to an internal IP before Nodemailer receives a socket", async () => {
    vi.mocked(lookup as unknown as LookupAll).mockImplementation((_host, _options, callback) => {
      callback(null, [{ address: "127.0.0.1", family: 4 }]);
    });
    const result = await configure().send(payload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("public address");
    expect(createConnection).toHaveBeenCalledWith(expect.objectContaining({ lookup: lookupPublicAddress }));
  });

  it.each([465, 587])("keeps hostname and TLS mode for port %i while supplying a vetted raw socket", async (port) => {
    vi.mocked(lookup as unknown as LookupAll).mockImplementation((_host, _options, callback) => {
      callback(null, [{ address: "8.8.8.8", family: 4 }]);
    });
    expect((await configure(port).send(payload)).success).toBe(true);
    expect(options.host).toBe("smtp.example.com");
    expect(options.secure).toBe(port === 465);
    expect(options.requireTLS).toBe(port === 587);
  });

  it("validates DNS again for each send instead of reusing unchecked cached destinations", async () => {
    const dns = vi.mocked(lookup as unknown as LookupAll);
    dns.mockImplementationOnce((_host, _options, callback) => {
      callback(null, [{ address: "8.8.8.8", family: 4 }]);
    });
    dns.mockImplementationOnce((_host, _options, callback) => {
      callback(null, [{ address: "169.254.169.254", family: 4 }]);
    });
    const transporter = configure();
    expect((await transporter.send(payload)).success).toBe(true);
    expect((await transporter.send(payload)).success).toBe(false);
    expect(dns).toHaveBeenCalledTimes(2);
  });
});
