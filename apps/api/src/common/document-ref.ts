interface DocumentRefClient {
  candidate?: {
    findFirst?: (args: {
      where: {
        organizationId: string;
        resumeUrl: string;
        deletedAt: null;
      };
      select: { id: true };
    }) => Promise<unknown>;
  };
  application?: {
    findFirst?: (args: {
      where: {
        organizationId: string;
        resumeUrl: string;
      };
      select: { id: true };
    }) => Promise<unknown>;
  };
  candidateDocument?: {
    findFirst?: (args: {
      where: {
        organizationId: string;
        url: string;
      };
      select: { id: true };
    }) => Promise<unknown>;
  };
}

/**
 * Check whether any active Candidate, Application, or CandidateDocument
 * within the same organization still references the given document URL.
 * Used before deleting the underlying MinIO object so shared CVs stay intact.
 */
export async function hasRemainingDocumentUrlReference(
  tx: unknown,
  organizationId: string,
  url: string,
): Promise<boolean> {
  if (!tx || !organizationId || !url) return false;
  const db = tx as DocumentRefClient;

  if (typeof db.candidate?.findFirst === "function") {
    const candidateRef = await db.candidate.findFirst({
      where: {
        organizationId,
        resumeUrl: url,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (candidateRef) return true;
  }

  if (typeof db.application?.findFirst === "function") {
    const applicationRef = await db.application.findFirst({
      where: {
        organizationId,
        resumeUrl: url,
      },
      select: { id: true },
    });
    if (applicationRef) return true;
  }

  if (typeof db.candidateDocument?.findFirst === "function") {
    const documentRef = await db.candidateDocument.findFirst({
      where: {
        organizationId,
        url,
      },
      select: { id: true },
    });
    if (documentRef) return true;
  }

  return false;
}
