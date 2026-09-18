import dotenv from "dotenv";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

dotenv.config({ path: resolve(process.cwd(), ".env") });

async function migrate() {
  console.log("Starting Document Migration from notes to CandidateDocument table...");
  const { db, connectDatabase } = await import("./db");
  await connectDatabase();

  const candidates = await db.orm.public.Candidate.select(
    "id",
    "organizationId",
    "notes",
    "resumeUrl",
    "resumeFileName",
    "resumeFileSize",
    "resumeMimeType",
    "createdAt"
  ).all();

  console.log(`Found ${candidates.length} candidates to process.`);
  let totalDocsMigrated = 0;

  for (const candidate of candidates) {
    const existingDocs = await db.orm.public.CandidateDocument.select("id")
      .where((d: any) => d.candidateId.eq(candidate.id))
      .all();

    if (existingDocs.length > 0) {
      continue; // Already has documents in table
    }

    const docsToInsert: Array<{
      id: string;
      candidateId: string;
      organizationId: string;
      name: string;
      url: string;
      size: number | null;
      mimeType: string;
      type: string;
    }> = [];

    // 1. Check notes for embedded Docs: [...]
    if (candidate.notes) {
      const match = candidate.notes.match(/Docs:\s*(\[[^\]]*\])/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            for (const d of parsed) {
              if (d.url && d.url.trim() !== "") {
                docsToInsert.push({
                  id: d.id || randomUUID(),
                  candidateId: candidate.id,
                  organizationId: candidate.organizationId,
                  name: d.name || "document.pdf",
                  url: d.url,
                  size: d.size ?? null,
                  mimeType: d.mimeType || "application/pdf",
                  type: d.type || "Resume",
                });
              }
            }
          }
        } catch {
          // ignore json parse error
        }
      }
    }

    // 2. If no docs in notes, check resumeUrl
    if (docsToInsert.length === 0 && candidate.resumeUrl && candidate.resumeUrl.trim() !== "") {
      docsToInsert.push({
        id: randomUUID(),
        candidateId: candidate.id,
        organizationId: candidate.organizationId,
        name: candidate.resumeFileName || "Resume.pdf",
        url: candidate.resumeUrl,
        size: candidate.resumeFileSize ?? null,
        mimeType: candidate.resumeMimeType || "application/pdf",
        type: "Resume",
      });
    }

    // Insert documents into candidateDocument table
    for (const doc of docsToInsert) {
      await (db.orm.public as any).CandidateDocument.create({
        id: doc.id,
        candidateId: doc.candidateId,
        organizationId: doc.organizationId,
        name: doc.name,
        url: doc.url,
        size: doc.size,
        mimeType: doc.mimeType,
        type: doc.type,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      totalDocsMigrated++;
    }
  }

  console.log(`Migration complete! Successfully migrated ${totalDocsMigrated} documents.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
