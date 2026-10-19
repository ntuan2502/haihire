import { ApplyToJobModal } from "@/components/candidates/apply-to-job-modal";
import { DeleteCandidateModal } from "@/components/candidates/delete-candidate-modal";
import { DeleteDocumentModal } from "@/components/candidates/delete-document-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { SendEmailModal } from "@/components/email/send-email-modal";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Candidate, Application, CandidateDocument, Job } from "@/types";

interface CandidateDetailModalsProps {
  candidate: Candidate | null | undefined;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobs: Job[];
  candidateApps: Application[];
  applyModalOpen: boolean;
  setApplyModalOpen: (open: boolean) => void;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (open: boolean) => void;
  isDeletingCandidate: boolean;
  onConfirmDeleteCandidate: () => void;
  docToDelete: CandidateDocument | null;
  setDocToDelete: (doc: CandidateDocument | null) => void;
  isDeletingDoc: boolean;
  onConfirmDeleteDoc: () => void;
  scheduleInterviewApp: Application | null;
  setScheduleInterviewApp: (app: Application | null) => void;
  editingInterview: ScheduledInterviewInfo | null;
  setEditingInterview: (intv: ScheduledInterviewInfo | null) => void;
  isSendEmailOpen: boolean;
  setIsSendEmailOpen: (open: boolean) => void;
}

export function CandidateDetailModals({
  candidate,
  candidateName,
  candidateEmail,
  candidatePhone,
  jobs,
  candidateApps,
  applyModalOpen,
  setApplyModalOpen,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  isDeletingCandidate,
  onConfirmDeleteCandidate,
  docToDelete,
  setDocToDelete,
  isDeletingDoc,
  onConfirmDeleteDoc,
  scheduleInterviewApp,
  setScheduleInterviewApp,
  editingInterview,
  setEditingInterview,
  isSendEmailOpen,
  setIsSendEmailOpen,
}: CandidateDetailModalsProps) {
  return (
    <>
      {/* Apply to Job Modal */}
      <ApplyToJobModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        candidate={
          candidate
            ? {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone || undefined,
                notes: candidate.notes || undefined,
                resumeUrl: candidate.resumeUrl,
                resumeFileName: candidate.resumeFileName,
              }
            : null
        }
        existingApplications={candidateApps}
      />

      {/* Delete Candidate Confirmation Modal */}
      {candidate && (
        <DeleteCandidateModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={onConfirmDeleteCandidate}
          candidateName={candidateName}
          isDeleting={isDeletingCandidate}
        />
      )}

      {/* Delete Document Confirmation Modal */}
      <DeleteDocumentModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={onConfirmDeleteDoc}
        isLoading={isDeletingDoc}
      />

      {/* Schedule Interview Modal */}
      {scheduleInterviewApp && (
        <ScheduleInterviewModal
          isOpen={!!scheduleInterviewApp}
          onClose={() => {
            setScheduleInterviewApp(null);
            setEditingInterview(null);
          }}
          jobs={jobs}
          applications={candidateApps}
          selectedJobId={scheduleInterviewApp.jobId || undefined}
          selectedApplicationId={scheduleInterviewApp.id}
          editingInterview={editingInterview}
        />
      )}

      {/* Send Email Modal */}
      {candidate && (
        <SendEmailModal
          isOpen={isSendEmailOpen}
          onClose={() => setIsSendEmailOpen(false)}
          candidate={{
            id: candidate.id,
            name: candidateName,
            email: candidateEmail,
            phone: candidatePhone,
          }}
          jobTitle={candidateApps[0]?.job?.title}
          organizationName={
            candidateApps[0]?.job?.department
              ? `${candidateApps[0]?.job?.department} Department`
              : "Nexus ATS"
          }
        />
      )}
    </>
  );
}
