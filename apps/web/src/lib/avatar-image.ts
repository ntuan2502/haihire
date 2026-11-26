const AVATAR_SIZE_PX = 256;

function encodeCanvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function decodeImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
} | null> {
  if (typeof globalThis.createImageBitmap === "function") {
    try {
      const bitmap = await globalThis.createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Fall back to HTMLImageElement below
    }
  }

  if (
    typeof Image === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent))
  ) {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      const timer = setTimeout(() => {
        reject(new Error("Timed out decoding image"));
      }, 2000);
      el.onload = () => {
        clearTimeout(timer);
        resolve(el);
      };
      el.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Failed to decode image"));
      };
      el.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    return null;
  }
}

/**
 * Center-crops and resizes an image to 256x256 on an offscreen Canvas (stripping EXIF/GPS metadata).
 * Falls back gracefully to the original File when browser Canvas APIs are unavailable (e.g. jsdom).
 */
export async function prepareAvatarUploadFile(file: File): Promise<File> {
  if (typeof document === "undefined") return file;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE_PX;
  canvas.height = AVATAR_SIZE_PX;
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return file;

  const decoded = await decodeImageSource(file);
  if (!decoded || decoded.width <= 0 || decoded.height <= 0) {
    decoded?.cleanup();
    return file;
  }

  try {
    const cropSize = Math.min(decoded.width, decoded.height);
    const sx = Math.floor((decoded.width - cropSize) / 2);
    const sy = Math.floor((decoded.height - cropSize) / 2);
    ctx.drawImage(
      decoded.source,
      sx,
      sy,
      cropSize,
      cropSize,
      0,
      0,
      AVATAR_SIZE_PX,
      AVATAR_SIZE_PX,
    );

    const webpBlob = await encodeCanvasToBlob(canvas, "image/webp", 0.85);
    if (webpBlob && webpBlob.size > 0 && webpBlob.type === "image/webp") {
      return new File([webpBlob], "avatar.webp", { type: "image/webp" });
    }

    const jpegBlob = await encodeCanvasToBlob(canvas, "image/jpeg", 0.9);
    if (jpegBlob && jpegBlob.size > 0) {
      return new File([jpegBlob], "avatar.jpg", { type: "image/jpeg" });
    }

    return file;
  } catch {
    return file;
  } finally {
    decoded.cleanup();
  }
}

/**
 * Computes a privacy-safe SHA-256 Gravatar URL (`d=404`) for live previewing.
 */
export async function computeGravatarUrl(
  email: string,
  size = AVATAR_SIZE_PX,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !globalThis.crypto?.subtle) return null;
  const encoded = new TextEncoder().encode(normalized);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `https://www.gravatar.com/avatar/${hex}?s=${size}&d=404`;
}
