import { describe, expect, it } from "vitest";
import { EncryptionService } from "./encryption.service";

describe("EncryptionService", () => {
  const service = new EncryptionService();

  it("should encrypt plaintext into iv:authTag:ciphertext format", () => {
    const secret = "SuperSecretPassword123!";
    const encrypted = service.encrypt(secret);

    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(secret);

    const parts = encrypted!.split(":");
    expect(parts.length).toBe(3);
    expect(parts[0].length).toBe(24); // 12 bytes hex IV
    expect(parts[1].length).toBe(32); // 16 bytes hex Auth Tag
  });

  it("should decrypt ciphertext back to original plaintext", () => {
    const original = "smtp-password-abc-xyz";
    const encrypted = service.encrypt(original);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(original);
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
