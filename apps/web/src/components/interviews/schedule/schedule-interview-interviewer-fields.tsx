"use client";

import { FileText, User } from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { FlowEmailToggleField } from "@/components/email/flow-email-toggle-field";
import { useI18n } from "@/i18n";
import type { EmailTemplate } from "@/lib/email-templates";

interface ScheduleInterviewInterviewerFieldsProps {
  interviewerId: string;
  onInterviewerIdChange: (val: string) => void;
  interviewNotes: string;
  onNotesChange: (val: string) => void;
  members: Array<{ id: string; name: string; email: string }>;
  isEditing: boolean;
  sendEmailInvite: boolean;
  onSendEmailInviteChange: (val: boolean) => void;
  canViewEmail: boolean;
  selectedTemplateId: string;
  onSelectedTemplateIdChange: (val: string) => void;
  activeTemplates: EmailTemplate[];
  isSaving: boolean;
}

export function ScheduleInterviewInterviewerFields({
  interviewerId,
  onInterviewerIdChange,
  interviewNotes,
  onNotesChange,
  members,
  isEditing,
  sendEmailInvite,
  onSendEmailInviteChange,
  canViewEmail,
  selectedTemplateId,
  onSelectedTemplateIdChange,
  activeTemplates,
  isSaving,
}: ScheduleInterviewInterviewerFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label
          htmlFor="primary-interviewer-trigger"
          className="text-xs font-bold text-foreground flex items-center justify-between"
        >
          <span className="flex items-center gap-1">
            <User
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <span>
              {t("interviews.primaryInterviewer")}{" "}
              <span className="text-rose-500">*</span>
            </span>
          </span>
        </label>
        <CustomSelect
          id="primary-interviewer"
          aria-label={t("interviews.primaryInterviewer")}
          value={interviewerId}
          onChange={onInterviewerIdChange}
          placeholder={t("interviews.selectFromMembers")}
          options={members.map((member) => ({
            value: member.id,
            label: `${member.name} (${member.email})`,
          }))}
          disabled={isSaving}
          className="w-full"
          triggerClassName="h-10 text-xs font-medium"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="schedule-interview-notes"
          className="text-xs font-bold text-foreground flex items-center gap-1"
        >
          <FileText
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <span>{t("interviews.notesOrRequirements")}</span>
        </label>
        <Input
          id="schedule-interview-notes"
          type="text"
          placeholder={t("interviews.placeholders.notes")}
          value={interviewNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={isSaving}
          className="h-10 rounded-md text-xs bg-background border-input"
        />
      </div>

      {/* Send Email Invitation Checkbox + Template Override (Create Only) */}
      {!isEditing && (
        <div className="sm:col-span-2">
          <FlowEmailToggleField
            hasEmail={true}
            checkboxId="sendEmailInviteCheckbox"
            checked={sendEmailInvite}
            onCheckedChange={onSendEmailInviteChange}
            sendLabel={t("email.sendEmailInviteCheckbox")}
            noEmailHint=""
            canSelectTemplate={canViewEmail}
            templateSelectId="interview-email-template-select"
            templateLabel={t("email.interviewTemplateSelectLabel")}
            templateValue={selectedTemplateId}
            onTemplateChange={onSelectedTemplateIdChange}
            activeTemplates={activeTemplates}
            disabled={isSaving}
          />
        </div>
      )}
    </div>
  );
}
