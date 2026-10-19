import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useAllJobs, useCandidate } from "@/hooks/use-queries";
import {
  isValidUuid,
  formatDate,
  parseCandidateNotes,
  parseCandidateDocuments,
} from "@/lib/utils";

export function useCandidateDetailState() {
  const params = useParams();
  const { user, canEdit } = useAuth();
  const candidateIdStr = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const isCandidateIdValid = isValidUuid(candidateIdStr);
  const { data: candidate, isLoading: candidateLoading } = useCandidate(
    isCandidateIdValid ? candidateIdStr : null,
  );
  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );

  const [activeTab, setActiveTab] = useState<"applications" | "documents">(
    "applications",
  );
  const [stageFilter, setStageFilter] = useState("ALL");
  const [documentFilter, setDocumentFilter] = useState("Resume");

  const candidateApps = useMemo(() => {
    return candidate?.applications || [];
  }, [candidate]);

  const filteredCandidateApps = useMemo(() => {
    if (stageFilter === "ALL") return candidateApps;
    return candidateApps.filter((a) => a.stage === stageFilter);
  }, [candidateApps, stageFilter]);

  const candidateDocuments = useMemo(() => {
    if (!candidate) return [];
    if (candidate.allDocuments && candidate.allDocuments.length > 0) {
      return candidate.allDocuments;
    }
    const directDocs = parseCandidateDocuments(candidate.notes, {
      id: candidate.id,
      resumeUrl: candidate.resumeUrl || "",
      resumeFileName: candidate.resumeFileName || "Resume.pdf",
      resumeFileSize: candidate.resumeFileSize,
      resumeMimeType: candidate.resumeMimeType,
      createdAt: candidate.createdAt,
    });
    const allDocs = [...directDocs];
    const seenUrls = new Set(allDocs.map((d) => d.url).filter(Boolean));

    for (const app of candidateApps) {
      const appDocs = parseCandidateDocuments(app.notes, {
        id: app.id,
        resumeUrl: app.resumeUrl || "",
        resumeFileName: app.resumeFileName || "Application_Resume.pdf",
        resumeFileSize: app.resumeFileSize,
        resumeMimeType: app.resumeMimeType,
        createdAt: app.createdAt,
      });
      for (const d of appDocs) {
        if (d.url && !seenUrls.has(d.url)) {
          seenUrls.add(d.url);
          allDocs.push({
            ...d,
            sourceApplicationId: app.id,
            jobTitle: app.job?.title,
          });
        }
      }
    }
    return allDocs;
  }, [candidate, candidateApps]);

  const filteredDocuments = useMemo(() => {
    if (!documentFilter || documentFilter === "All") return candidateDocuments;
    return candidateDocuments.filter(
      (d) =>
        (d.type || "Resume").toLowerCase() === documentFilter.toLowerCase(),
    );
  }, [candidateDocuments, documentFilter]);

  const parsedNotes = parseCandidateNotes(candidate?.notes, candidate?.name);
  const gender = candidate?.gender || parsedNotes.gender;
  const dob = candidate?.dateOfBirth
    ? formatDate(candidate.dateOfBirth)
    : parsedNotes.dob;
  const candidateName = candidate?.name || "Candidate";
  const candidateEmail = candidate?.email || "—";
  const candidatePhone = candidate?.phone || "";
  const candidateCreated = formatDate(candidate?.createdAt);
  const candidateUpdated = formatDate(
    candidate?.updatedAt || candidate?.createdAt,
  );

  const loading = candidateLoading || jobsLoading;

  return {
    candidateIdStr,
    isCandidateIdValid,
    candidate,
    jobs,
    canEdit,
    loading,
    activeTab,
    setActiveTab,
    stageFilter,
    setStageFilter,
    documentFilter,
    setDocumentFilter,
    candidateApps,
    filteredCandidateApps,
    candidateDocuments,
    filteredDocuments,
    parsedNotes,
    gender,
    dob,
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateCreated,
    candidateUpdated,
  };
}
