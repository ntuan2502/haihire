import { Injectable } from "@nestjs/common";
import crypto from "node:crypto";

@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly key: Buffer;

  constructor() {
    // Derive a fixed 32-byte key from environment secret or secure fallback
    const rawSecret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || "ats-platform-secure-fallback-encryption-key-2026";
    this.key = crypto.scryptSync(rawSecret, "ats-salt-vector", 32);
  }

  encrypt(plainText?: string | null): string | null {
    if (!plainText || plainText.trim() === "") {
      return null;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    // Format: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  decrypt(cipherText?: string | null): string | null {
    if (!cipherText || cipherText.trim() === "") {
      return null;
    }

    const parts = cipherText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted payload format. Expected 'iv:authTag:ciphertext'");
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  mask(secret?: string | null): string | null {
    if (!secret || secret.trim() === "") {
      return null;
    }
    return "••••••••••••••••";
  }
}
