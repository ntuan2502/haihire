import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(scriptDir, "../public");
const destPath = path.join(publicDir, "pdf.worker.min.mjs");

const sourcePath = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");

fs.mkdirSync(publicDir, { recursive: true });

const sourceBuf = fs.readFileSync(sourcePath);
const existingBuf = fs.existsSync(destPath) ? fs.readFileSync(destPath) : null;

if (!existingBuf || !sourceBuf.equals(existingBuf)) {
  fs.writeFileSync(destPath, sourceBuf);
  console.log(`[sync-pdf-worker] Synced pdf.worker.min.mjs to ${destPath}`);
}
