"use client";

import React, { useState } from "react";
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
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useAuth } from "@/context/auth-context";
import type { CreateJobInput, JobStatus, JobType } from "@/types";
import { useCreateJobMutation } from "@/hooks/use-queries";
import { Briefcase, Building2, MapPin, DollarSign } from "lucide-react";
import { useI18n } from "@/i18n";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: () => void;
}

export function CreateJobModal({
  isOpen,
  onClose,
  onJobCreated,
}: CreateJobModalProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const createJobMutation = useCreateJobMutation();
  const [formData, setFormData] = useState<CreateJobInput>({
    title: "",
    department: "Engineering",
    location: "Remote",
    type: "FULL_TIME",
    description: "",
    requirements: "",
    salaryRange: "",
    status: "PUBLISHED",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.department || !formData.description) {
      setError(t("jobs.fillRequiredFields"));
      return;
    }

    try {
      setError(null);
      await createJobMutation.mutateAsync({
        ...formData,
        organizationId: user?.organizationId ?? null,
        createdById: user?.id ?? null,
      });
      onJobCreated?.();
      onClose();
      // Reset form
      setFormData({
        title: "",
        department: "Engineering",
        location: "Remote",
        type: "FULL_TIME",
        description: "",
        requirements: "",
        salaryRange: "",
        status: "PUBLISHED",
      });
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to create job opening. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{t("jobs.postJobTitle")}</DialogTitle>
              <DialogDescription>
                {t("jobs.postJobDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("jobs.jobTitle")} *
            </label>
            <Input
              placeholder="e.g. Senior Frontend Engineer"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {t("jobs.department")} *
              </label>
              <Input
                placeholder="e.g. Engineering, Design, Sales"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {t("jobs.location")} *
              </label>
              <Input
                placeholder="e.g. Remote, Hanoi, Ho Chi Minh"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("jobs.type")}
              </label>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  setFormData({ ...formData, type: val as JobType })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">{t("jobs.fullTime")}</SelectItem>
                  <SelectItem value="PART_TIME">{t("jobs.partTime")}</SelectItem>
                  <SelectItem value="CONTRACT">{t("jobs.contract")}</SelectItem>
                  <SelectItem value="REMOTE">Remote</SelectItem>
                  <SelectItem value="INTERNSHIP">{t("jobs.internship")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("jobs.status")}
              </label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData({ ...formData, status: val as JobStatus })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">{t("jobs.active")}</SelectItem>
                  <SelectItem value="DRAFT">{t("jobs.draft")}</SelectItem>
                  <SelectItem value="CLOSED">{t("jobs.closed")}</SelectItem>
                  <SelectItem value="ARCHIVED">{t("jobs.closed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> {t("jobs.salaryRange")}
              </label>
              <Input
                placeholder="e.g. $2,000 - $3,500"
                value={formData.salaryRange || ""}
                onChange={(e) =>
                  setFormData({ ...formData, salaryRange: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("jobs.description")} *
            </label>
            <Textarea
              placeholder="Provide a detailed overview of the position, key responsibilities, and team mission..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("jobs.requirements")}
            </label>
            <Textarea
              placeholder="e.g. 3+ years experience with React/Next.js, TypeScript, NestJS..."
              value={formData.requirements || ""}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
              rows={3}
              className="mt-1"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createJobMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createJobMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createJobMutation.isPending ? t("jobs.publishingJob") : t("jobs.publishJobOpening")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
