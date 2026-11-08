import { Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { env } from "../config/env";

@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly legacySalt = "haihire-salt-vector";

  private deriveKey(salt: Buffer | string): Buffer {
    return crypto.scryptSync(env.ENCRYPTION_SECRET, salt, 32);
  }

  encrypt(plainText?: string | null): string | null {
    if (!plainText || plainText.trim() === "") {
      return null;
    }

    const salt = crypto.randomBytes(16);
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    // Format: salt:iv:authTag:encrypted (4 parts)
    return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  decrypt(cipherText?: string | null): string | null {
    if (!cipherText || cipherText.trim() === "") {
      return null;
    }

    const parts = cipherText.split(":");
    if (parts.length !== 3 && parts.length !== 4) {
      throw new Error(
        "Invalid encrypted payload format. Expected 'salt:iv:authTag:ciphertext' or legacy 'iv:authTag:ciphertext'",
      );
    }

    let key: Buffer;
    let ivHex: string;
    let authTagHex: string;
    let encryptedHex: string;

    if (parts.length === 4) {
      const [saltHex, iv, authTag, encrypted] = parts;
      key = this.deriveKey(Buffer.from(saltHex, "hex"));
      ivHex = iv;
      authTagHex = authTag;
      encryptedHex = encrypted;
    } else {
      // Legacy 3-part format fallback
      key = this.deriveKey(this.legacySalt);
      [ivHex, authTagHex, encryptedHex] = parts;
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
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
