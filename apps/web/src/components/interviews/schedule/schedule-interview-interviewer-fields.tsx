"use client";

import { FileText, Mail, User } from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { FlowTemplateSelect } from "@/components/email/flow-template-selector";
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
          htmlFor="primary-interviewer"
          className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between"
        >
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-slate-400" />
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
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span>{t("interviews.notesOrRequirements")}</span>
        </label>
        <Input
          type="text"
          placeholder={t("interviews.placeholders.notes")}
          value={interviewNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
        />
      </div>

      {/* Send Email Invitation Checkbox + Template Override (Create Only) */}
      {!isEditing && (
        <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendEmailInviteCheckbox"
              checked={sendEmailInvite}
              onChange={(e) => onSendEmailInviteChange(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
            />
            <label
              htmlFor="sendEmailInviteCheckbox"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              <span>{t("email.sendEmailInviteCheckbox")}</span>
            </label>
          </div>

          {sendEmailInvite && canViewEmail && (
            <FlowTemplateSelect
              selectId="interview-email-template-select"
              label={t("email.interviewTemplateSelectLabel")}
              value={selectedTemplateId}
              onChange={onSelectedTemplateIdChange}
              activeTemplates={activeTemplates}
              disabled={isSaving}
            />
          )}
        </div>
      )}
    </div>
  );
}
