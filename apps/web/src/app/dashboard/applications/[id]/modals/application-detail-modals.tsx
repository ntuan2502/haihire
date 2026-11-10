import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { SendEmailModal } from "@/components/email/send-email-modal";
import type { Application, CandidateDocument, Job } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

interface ApplicationDetailModalsProps {
  app: Application | null | undefined;
  jobs: Job[];
  job?: Job;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  previewDoc: CandidateDocument | null;
  onClosePreviewDoc: () => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => void;
  isDeleteModalOpen: boolean;
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
  scheduleModalOpen: boolean;
  onCloseScheduleModal: () => void;
  editingInterview: ScheduledInterviewInfo | null;
  isSendEmailOpen: boolean;
  onCloseSendEmailModal: () => void;
}

export function ApplicationDetailModals({
  app,
  jobs,
  job,
  candidateName,
  candidateEmail,
  candidatePhone,
  jobTitle,
  previewDoc,
  onClosePreviewDoc,
  onDownloadDoc,
  isDeleteModalOpen,
  onCloseDeleteModal,
  onConfirmDelete,
  isDeleting,
  scheduleModalOpen,
  onCloseScheduleModal,
  editingInterview,
  isSendEmailOpen,
  onCloseSendEmailModal,
}: ApplicationDetailModalsProps) {
  return (
    <>
      {/* Document Preview Modal matching Screenshot 2 */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={onClosePreviewDoc}
        document={previewDoc}
        appId={app?.id}
        onDownload={onDownloadDoc}
      />

      {/* Delete Application Confirmation Modal */}
      {app && (
        <DeleteApplicationModal
          isOpen={isDeleteModalOpen}
          onClose={onCloseDeleteModal}
          onConfirm={onConfirmDelete}
          candidateName={candidateName}
          jobTitle={jobTitle}
          isDeleting={isDeleting}
        />
      )}

      {/* Schedule Interview Modal */}
      {app && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={onCloseScheduleModal}
          jobs={jobs}
          applications={app ? [app] : []}
          selectedJobId={app.jobId || undefined}
          selectedApplicationId={app.id}
          editingInterview={editingInterview}
        />
      )}

      {/* Send Email Modal */}
      {app && (
        <SendEmailModal
          isOpen={isSendEmailOpen}
          onClose={onCloseSendEmailModal}
          candidate={{
            id: app.candidateId,
            name: candidateName,
            email: candidateEmail,
            phone: candidatePhone,
          }}
          jobTitle={jobTitle}
          organizationName={
            job?.department ? `${job.department} Department` : "Nexus ATS"
          }
        />
      )}
    </>
  );
}
