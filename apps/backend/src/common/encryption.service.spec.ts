import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { EncryptionService } from "./encryption.service";
import { env } from "../config/env";

describe("EncryptionService", () => {
  const service = new EncryptionService();

  it("should encrypt plaintext into salt:iv:authTag:ciphertext format (4 parts)", () => {
    const secret = "SuperSecretPassword123!";
    const encrypted = service.encrypt(secret);

    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(secret);

    const parts = encrypted!.split(":");
    expect(parts.length).toBe(4);
    expect(parts[0].length).toBe(32); // 16 bytes hex random salt
    expect(parts[1].length).toBe(24); // 12 bytes hex IV
    expect(parts[2].length).toBe(32); // 16 bytes hex Auth Tag
  });

  it("should decrypt ciphertext back to original plaintext", () => {
    const original = "smtp-password-abc-xyz";
    const encrypted = service.encrypt(original);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it("should decrypt legacy 3-part ciphertext format (iv:authTag:ciphertext)", () => {
    // Generate legacy 3-part ciphertext using the legacy static salt
    const legacyKey = crypto.scryptSync(env.ENCRYPTION_SECRET, "haihire-salt-vector", 32);
    const iv = Buffer.alloc(12, 1);
    const cipher = crypto.createCipheriv("aes-256-gcm", legacyKey, iv);
    let encrypted = cipher.update("legacy-secret-value", "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    const legacyCipher = `${iv.toString("hex")}:${authTag}:${encrypted}`;

    const decrypted = service.decrypt(legacyCipher);
    expect(decrypted).toBe("legacy-secret-value");
  });

  it("should handle null, undefined, and empty string gracefully", () => {
    expect(service.encrypt(null)).toBeNull();
    expect(service.encrypt(undefined)).toBeNull();
    expect(service.encrypt("")).toBeNull();
    expect(service.encrypt("   ")).toBeNull();

    expect(service.decrypt(null)).toBeNull();
    expect(service.decrypt(undefined)).toBeNull();
    expect(service.decrypt("")).toBeNull();
  });

  it("should throw error on invalid ciphertext format without legacy fallback", () => {
    const invalidCipher = "unencrypted-password-123";
    expect(() => service.decrypt(invalidCipher)).toThrow(
      "Invalid encrypted payload format",
    );
  });

  it("should mask secrets with bullet characters", () => {
    expect(service.mask("secret-value")).toBe("••••••••••••••••");
    expect(service.mask("")).toBeNull();
    expect(service.mask(null)).toBeNull();
    expect(service.mask(undefined)).toBeNull();
  });
});
