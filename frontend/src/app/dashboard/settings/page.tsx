"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import {
  useMyOrg,
  useUpdateMyOrgMutation,
  useDeleteMyOrgMutation,
} from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Building2,
  Globe,
  Bell,
  AppWindow,
  Users,
  CreditCard,
  Plug,
  Bot,
  Clock,
  ShieldCheck,
  User as UserIcon,
  Lock,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsTab =
  | "general"
  | "localization"
  | "notifications"
  | "career-page"
  | "members"
  | "billing"
  | "integrations"
  | "ai-configuration"
  | "privacy-retention"
  | "sso"
  | "account";

interface NavItem {
  id: SettingsTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  locked?: boolean;
  beta?: boolean;
}

const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    id: "general",
    label: "General",
    sublabel: "Organization profile",
    icon: Building2,
  },
  {
    id: "localization",
    label: "Localization",
    sublabel: "Names & date formats",
    icon: Globe,
  },
  {
    id: "notifications",
    label: "Notifications",
    sublabel: "Email alerts & digest",
    icon: Bell,
  },
  {
    id: "career-page",
    label: "Career Page",
    sublabel: "Branded public page",
    icon: AppWindow,
  },
  {
    id: "members",
    label: "Members",
    sublabel: "Team & invitations",
    icon: Users,
  },
  {
    id: "billing",
    label: "Billing",
    sublabel: "Plan & payment",
    icon: CreditCard,
  },
  {
    id: "integrations",
    label: "Integrations",
    sublabel: "Calendar & services",
    icon: Plug,
    locked: true,
  },
  {
    id: "ai-configuration",
    label: "AI Configuration",
    sublabel: "Models & API keys",
    icon: Bot,
    locked: true,
  },
  {
    id: "privacy-retention",
    label: "Privacy & Retent...",
    sublabel: "Retention policy",
    icon: Clock,
    locked: true,
  },
  {
    id: "sso",
    label: "Single Sig...",
    sublabel: "Enterprise SSO",
    icon: ShieldCheck,
    beta: true,
    locked: true,
  },
  {
    id: "account",
    label: "Account",
    sublabel: "Profile & security",
    icon: UserIcon,
  },
];

function SettingsPageContent() {
  const router = useRouter();
  const { user, updateUserOrg, logout } = useAuth();
  const { data: org, isLoading: isOrgLoading } = useMyOrg();
  const updateOrgMutation = useUpdateMyOrgMutation();
  const deleteOrgMutation = useDeleteMyOrgMutation();

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Form states
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [appHost, setAppHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppHost(window.location.host);
    }
  }, []);

  const displayHost = appHost || "localhost:3000";

  // Sync org data into form state
  useEffect(() => {
    if (org) {
      setOrgName(org.name || "");
      setOrgSlug(org.slug || "");
    } else if (user?.organization) {
      setOrgName(user.organization.name || "");
      setOrgSlug(user.organization.slug || "");
    }
  }, [org, user]);

  // Handle saving organization profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setSaveError(null);

    const trimmedName = orgName.trim();
    const trimmedSlug = orgSlug.toLowerCase().trim();

    if (!trimmedName) {
      setSaveError("Organization name is required.");
      return;
    }
    if (!trimmedSlug) {
      setSaveError("URL slug is required.");
      return;
    }

    try {
      const updated = await updateOrgMutation.mutateAsync({
        name: trimmedName,
        slug: trimmedSlug,
      });

      if (updated) {
        updateUserOrg(updated);
      }

      setSaveSuccess("Organization profile updated successfully.");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? "Failed to update organization profile.")
          : "Failed to update organization profile.";
      setSaveError(message);
    }
  };

  // Handle deleting organization
  const handleDeleteOrg = async () => {
    if (deleteConfirmText.toLowerCase() !== orgSlug.toLowerCase()) {
      return;
    }

    try {
      await deleteOrgMutation.mutateAsync();
      setDeleteModalOpen(false);
      logout();
      router.push("/onboarding/create-org");
    } catch (err) {
      console.error("Failed to delete organization:", err);
      setSaveError("Failed to delete organization. Please try again.");
    }
  };

  const copyInviteCode = () => {
    if (org?.inviteCode) {
      navigator.clipboard.writeText(org.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col">
      <Navbar activeTab="settings" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* ================= LEFT SIDEBAR ================= */}
          <aside className="md:col-span-4 lg:col-span-3 space-y-4">
            {/* Back to jobs link */}
            <Link
              href="/dashboard/jobs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to jobs</span>
            </Link>

            {/* Sidebar Title */}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <SettingsIcon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Settings
              </h2>
            </div>

            {/* Navigation List */}
            <nav className="space-y-1">
              {SETTINGS_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer group",
                      isActive
                        ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 shadow-2xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/60",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate">
                            {item.label}
                          </span>
                          {item.beta && (
                            <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold uppercase text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                              Beta
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {item.sublabel}
                        </p>
                      </div>
                    </div>

                    {item.locked && (
                      <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ================= RIGHT CONTENT AREA ================= */}
          <section className="md:col-span-8 lg:col-span-9 space-y-6">
            {/* TAB 1: GENERAL (Matches screenshot) */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header */}
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    General
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage your organization&apos;s profile and configuration.
                  </p>
                </div>

                {/* Notifications */}
                {saveSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{saveSuccess}</span>
                  </div>
                )}
                {saveError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{saveError}</span>
                  </div>
                )}

                {/* CARD 1: Organization profile */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  {/* Card Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Organization profile
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Basic information about your organization.
                      </p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {/* Organization name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Organization name
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Acme Corp"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950"
                        required
                        disabled={isOrgLoading || updateOrgMutation.isPending}
                      />
                    </div>

                    {/* URL slug */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        URL slug
                      </label>
                      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                        <span className="px-3 py-2 bg-slate-100/80 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-medium select-none border-r border-slate-200 dark:border-slate-800 shrink-0">
                          {displayHost}/
                        </span>
                        <input
                          type="text"
                          placeholder="amt"
                          value={orgSlug}
                          onChange={(e) =>
                            setOrgSlug(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, ""),
                            )
                          }
                          className="flex-1 h-10 px-3 text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                          required
                          disabled={isOrgLoading || updateOrgMutation.isPending}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                        Used in your public job board URL. Only lowercase
                        letters, numbers, and hyphens.
                      </p>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isOrgLoading || updateOrgMutation.isPending}
                        className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        {updateOrgMutation.isPending
                          ? "Saving..."
                          : "Save changes"}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* CARD 2: Danger zone */}
                <div className="rounded-2xl border border-rose-200/80 bg-white dark:bg-slate-900 dark:border-rose-950/60 p-6 shadow-xs space-y-4">
                  {/* Danger Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 dark:bg-rose-950/60 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        Danger zone
                      </h3>
                      <p className="text-xs text-rose-500/80 dark:text-rose-400/80">
                        Irreversible and destructive actions.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-rose-100 dark:border-rose-950/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Delete organization
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Permanently delete this organization and all its data.
                        This action cannot be undone.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteModalOpen(true)}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold px-3.5 py-1.5 rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LOCALIZATION */}
            {activeTab === "localization" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Localization
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Configure language, time zones, and date format preferences.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Default Language
                    </label>
                    <select className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 outline-none">
                      <option value="en">English (US)</option>
                      <option value="vi">Tiếng Việt (Vietnamese)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Time Zone
                    </label>
                    <select className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 outline-none">
                      <option value="Asia/Ho_Chi_Minh">
                        (GMT+07:00) Indochina Time - Hanoi, Bangkok, Jakarta
                      </option>
                      <option value="UTC">(GMT+00:00) UTC</option>
                      <option value="America/New_York">
                        (GMT-05:00) Eastern Time - New York
                      </option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                    >
                      Save preferences
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Notifications
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage how your team receives candidate activity and alerts.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        New Application Alert
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Receive instant email notifications when a candidate
                        applies.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Daily Digest
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        A summary of pipeline movements and scheduled interviews
                        every morning.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                    >
                      Save notification preferences
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CAREER PAGE */}
            {activeTab === "career-page" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Career Page
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your public-facing company job portal.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Public Job Board Link
                      </span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                        {displayHost}/{orgSlug || "amt"}
                      </p>
                    </div>

                    <a
                      href={`/dashboard/jobs`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                    >
                      <span>Preview</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Jobs published with status &quot;Published&quot; will
                    automatically appear on your public career board.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 5: MEMBERS */}
            {activeTab === "members" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Members & Invitations
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage team members and invite recruiters to collaborate.
                  </p>
                </div>

                {/* Organization Invite Code Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        Organization Invite Code
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Share this code with team members so they can join this
                        organization during sign up.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        {org?.inviteCode || "ORG-742918"}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyInviteCode}
                        className="h-8 text-xs font-semibold gap-1"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: BILLING */}
            {activeTab === "billing" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Billing & Plan
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage your subscription, invoices, and job posting limits.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                        Free Starter Plan
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                        1 Active Job Slot
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Upgrade to Pro to post unlimited jobs and access AI
                        candidate ranking.
                      </p>
                    </div>

                    <Button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LOCKED ENTERPRISE / PRO FEATURES */}
            {(activeTab === "integrations" ||
              activeTab === "ai-configuration" ||
              activeTab === "privacy-retention" ||
              activeTab === "sso") && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {SETTINGS_NAV_ITEMS.find((t) => t.id === activeTab)?.label}
                    </span>
                    <Lock className="h-4 w-4 text-slate-400" />
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {
                      SETTINGS_NAV_ITEMS.find((t) => t.id === activeTab)
                        ?.sublabel
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-4 max-w-lg mx-auto my-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Pro & Enterprise Feature
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    This module provides enterprise-level integrations,
                    retention safeguards, and dedicated custom AI models.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("billing")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-5"
                  >
                    View Upgrade Plans
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: ACCOUNT */}
            {activeTab === "account" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Account Profile
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your personal user profile and credentials.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Your Name
                      </label>
                      <Input
                        type="text"
                        disabled
                        value={user?.name || "Admin User"}
                        className="h-10 text-xs bg-slate-50 dark:bg-slate-950 opacity-80"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        disabled
                        value={user?.email || "admin@example.com"}
                        className="h-10 text-xs bg-slate-50 dark:bg-slate-950 opacity-80"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={logout}
                      className="h-9 px-4 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400"
                    >
                      Sign out
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ================= DELETE ORGANIZATION CONFIRMATION MODAL ================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Delete Organization
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900 dark:text-white">
                {orgName || org?.name}
              </strong>
              ? All jobs, candidates, and applications associated with this
              organization will be removed.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type <span className="font-mono text-rose-600 font-bold">{orgSlug}</span> to confirm:
              </label>
              <Input
                type="text"
                placeholder={orgSlug}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText("");
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  deleteConfirmText.toLowerCase() !== orgSlug.toLowerCase() ||
                  deleteOrgMutation.isPending
                }
                onClick={handleDeleteOrg}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl px-4"
              >
                {deleteOrgMutation.isPending ? "Deleting..." : "Delete Organization"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsPageContent />
    </AuthGuard>
  );
}
