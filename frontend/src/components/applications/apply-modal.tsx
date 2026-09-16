"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { applicationsApi } from "@/lib/api";
import type { Job } from "@/types";
import {
  UserPlus,
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  Mail,
  User,
  Phone,
} from "lucide-react";
import { formatFileSize, buildCandidateNotes } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  selectedJobId?: string | null;
  onApplicationSubmitted?: () => void;
}

export function ApplyModal({
  isOpen,
  onClose,
  jobs = [],
  selectedJobId,
  onApplicationSubmitted,
}: ApplyModalProps) {
  const { t } = useI18n();
  const [jobId, setJobId] = useState<string>(
    selectedJobId ? selectedJobId.toString() : "",
  );
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected job ID if changed from props
  React.useEffect(() => {
    if (selectedJobId) {
      setJobId(selectedJobId.toString());
    } else if (jobs.length > 0 && !jobId) {
      setJobId(jobs[0].id.toString());
    }
  }, [selectedJobId, jobs, jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf" && !selected.name.endsWith(".pdf")) {
        setError(t("applications.onlyPdfAccepted"));
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.type !== "application/pdf" && !dropped.name.endsWith(".pdf")) {
        setError(t("applications.onlyPdfAccepted"));
        return;
      }
      setFile(dropped);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !lastName.trim() || !firstName.trim() || !candidateEmail.trim()) {
      setError(t("applications.fillRequiredFields"));
      return;
    }
    if (!file) {
      setError(t("applications.attachResumeRequired"));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();
      const formattedNotes = buildCandidateNotes({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        customNotes: notes.trim() || undefined,
      });

      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("candidateName", fullName);
      formData.append("candidateEmail", candidateEmail.trim());
      if (candidatePhone) formData.append("candidatePhone", candidatePhone.trim());
      if (formattedNotes) formData.append("notes", formattedNotes);
      formData.append("resume", file);

      await applicationsApi.apply(formData);
      setSuccess(true);
      onApplicationSubmitted?.();

      setTimeout(() => {
        setSuccess(false);
        setLastName("");
        setFirstName("");
        setCandidateEmail("");
        setCandidatePhone("");
        setNotes("");
        setFile(null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to upload CV and submit application. Please check backend status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{t("applications.submitApplicationTitle")}</DialogTitle>
              <DialogDescription>
                {t("applications.submitApplicationDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-3 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {t("applications.applicationSubmittedSuccess")}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {t("applications.applicationSubmittedDesc")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Role Target */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("applications.applyingForPosition")} <span className="text-rose-500">*</span>
              </label>
              <Select
                value={jobId}
                onValueChange={(val) => val && setJobId(val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("applications.selectTargetRole")} />
                </SelectTrigger>
                <SelectContent>
                  {(jobs || []).map((job) => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.title} ({job.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Candidate Name: Họ và Tên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" /> {t("candidates.lastName")} <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Nguyen"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" /> {t("candidates.firstName")} <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Van A"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {t("candidates.email")} <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. candidate@example.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {t("candidates.phone")}
                </label>
                <Input
                  placeholder="e.g. +84 901 234 567"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Quick Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("candidates.columns.quickNotes")}
              </label>
              <Input
                placeholder="e.g. 5+ years React, available immediately"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Resume Upload Dropzone */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("candidates.resume")} (PDF) <span className="text-rose-500">*</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                className="hidden"
              />

              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-1.5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                      : "border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-2">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-indigo-600 dark:text-indigo-400 underline">
                      {t("candidates.chooseFile")}
                    </span>{" "}
                    {t("applications.dragDropResume")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t("applications.pdfUpTo10Mb")}
                  </p>
                </div>
              ) : (
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatFileSize(file.size)} • PDF Document
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    className="h-7 w-7 text-slate-400 hover:text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? t("applications.uploadingToStorage") : t("applications.submitApplication")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
