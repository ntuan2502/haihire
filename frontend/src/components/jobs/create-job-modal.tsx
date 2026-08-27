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
import { jobsApi } from "@/lib/api";
import type { CreateJobInput, JobStatus, JobType } from "@/types";
import { Briefcase, Building2, MapPin, DollarSign } from "lucide-react";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: () => void;
}

export function CreateJobModal({
  isOpen,
  onClose,
  onJobCreated,
}: CreateJobModalProps) {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.department || !formData.description) {
      setError("Please fill in all required fields (Title, Department, Description).");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await jobsApi.create(formData);
      onJobCreated();
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
    } finally {
      setLoading(false);
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
              <DialogTitle>Post New Job Opening</DialogTitle>
              <DialogDescription>
                Publish a new role to begin collecting and tracking candidate applications.
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
              Job Title <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Senior Full-Stack Engineer"
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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" /> Department <span className="text-rose-500">*</span>
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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Location
              </label>
              <Input
                placeholder="e.g. Ho Chi Minh City / Remote"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Employment Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  val && setFormData({ ...formData, type: val as JobType })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="REMOTE">Remote</SelectItem>
                  <SelectItem value="INTERNSHIP">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" /> Salary Range
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

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Initial Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  val && setFormData({ ...formData, status: val as JobStatus })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Role Description <span className="text-rose-500">*</span>
            </label>
            <Textarea
              placeholder="Outline the responsibilities, team structure, and impact of this role..."
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
              Key Requirements & Qualifications
            </label>
            <Textarea
              placeholder="e.g. 3+ years experience with Next.js, TypeScript, PostgreSQL, Docker..."
              value={formData.requirements || ""}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
              rows={3}
              className="mt-1"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading ? "Creating..." : "Publish Job Opening"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
