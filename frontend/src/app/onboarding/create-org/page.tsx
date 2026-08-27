"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Link2,
  Search,
  Building2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Organization } from "@/types";

export default function OnboardingCreateOrgPage() {
  const router = useRouter();
  const { user, updateUserOrg, isAuthenticated, loading: authLoading } = useAuth();

  // Mode: "create" | "join"
  const [mode, setMode] = useState<"create" | "join">("create");

  // Create form state
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Join form state
  const [inviteCodeOrSlug, setInviteCodeOrSlug] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [searching, setSearching] = useState(false);

  // Status & error state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Protect route
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // If user already has organization, allow them to view or navigate to dashboard
  useEffect(() => {
    if (user?.organizationId && user.organization) {
      // already has org
    }
  }, [user]);

  // Auto-generate slug from organization name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOrgName(value);

    if (!isSlugManuallyEdited) {
      const generated = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setSlug(generated);
    }
    setError(null);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(
      e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-"),
    );
    setError(null);
  };

  // Search organizations for request-to-join box
  useEffect(() => {
    if (mode !== "join") return;

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get<Organization[]>(
          `/organizations/search?q=${encodeURIComponent(searchQuery)}`,
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search orgs error", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  // Handle Create Organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("Please enter your organization name.");
      return;
    }
    if (!slug.trim()) {
      setError("Please enter a valid slug.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post<{ organization: Organization }>(
        "/organizations",
        {
          name: orgName.trim(),
          slug: slug.trim(),
        },
      );

      const createdOrg = res.data.organization;
      updateUserOrg(createdOrg);
      setSuccessMsg(`Workspace for "${createdOrg.name}" successfully created!`);

      setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (err: unknown) {
      console.error(err);
      if (typeof err === "object" && err !== null && "response" in err) {
        const res = err as { response?: { data?: { message?: string } } };
        setError(res.response?.data?.message || "Failed to create organization.");
      } else {
        setError("Error connecting to server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Join Organization via invite code or slug
  const handleJoinOrg = async (codeOrSlugToJoin?: string) => {
    const target = codeOrSlugToJoin || inviteCodeOrSlug;
    if (!target.trim()) {
      setError("Please provide an invite link, code, or organization slug.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post<{ organization: Organization; message: string }>(
        "/organizations/join",
        {
          inviteCodeOrSlug: target.trim(),
        },
      );

      const joinedOrg = res.data.organization;
      updateUserOrg(joinedOrg);
      setSuccessMsg(`Successfully joined ${joinedOrg.name}!`);

      setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (err: unknown) {
      console.error(err);
      if (typeof err === "object" && err !== null && "response" in err) {
        const res = err as { response?: { data?: { message?: string } } };
        setError(res.response?.data?.message || "Failed to join organization.");
      } else {
        setError("Error connecting to server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-200">
      <div className="w-full max-w-[480px]">
        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SCREEN 1: CREATE YOUR ORGANIZATION */}
        {mode === "create" ? (
          <div>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create your organization
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Set up your workspace to start managing candidates and jobs.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateOrg} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Organization name
                </label>
                <Input
                  type="text"
                  placeholder="Acme Corp"
                  value={orgName}
                  onChange={handleNameChange}
                  className="h-11 rounded-lg border-slate-200 bg-white px-3.5 text-sm dark:border-slate-800 dark:bg-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Slug
                </label>
                <Input
                  type="text"
                  placeholder="acme-corp"
                  value={slug}
                  onChange={handleSlugChange}
                  className="h-11 rounded-lg border-slate-200 bg-white px-3.5 text-sm font-mono dark:border-slate-800 dark:bg-slate-900"
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Used in URLs. Lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all cursor-pointer"
              >
                {submitting ? "Creating organization..." : "Create organization"}
              </Button>
            </form>

            {/* Footer switch link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("join");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                Join an existing organization instead
              </button>
            </div>
          </div>
        ) : (
          /* SCREEN 2: JOIN AN ORGANIZATION */
          <div>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Join an organization
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter an invite link/code, or search for an organization to request access.
              </p>
            </div>

            <div className="space-y-4">
              {/* Box 1: Have an invite link? */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800/90 dark:bg-slate-900 shadow-xs">
                <div className="flex items-center gap-2 mb-3.5">
                  <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Have an invite link?
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Input
                    type="text"
                    placeholder="Paste invite link or code"
                    value={inviteCodeOrSlug}
                    onChange={(e) => {
                      setInviteCodeOrSlug(e.target.value);
                      setError(null);
                    }}
                    className="h-10 rounded-lg border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950"
                  />
                  <Button
                    type="button"
                    onClick={() => handleJoinOrg()}
                    disabled={submitting || !inviteCodeOrSlug.trim()}
                    className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm cursor-pointer"
                  >
                    Join
                  </Button>
                </div>
              </div>

              {/* Divider: or */}
              <div className="relative flex items-center justify-center my-4">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                <span className="absolute bg-slate-50 dark:bg-slate-950 px-3 text-xs text-slate-400 font-medium">
                  or
                </span>
              </div>

              {/* Box 2: Request to join */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800/90 dark:bg-slate-900 shadow-xs">
                <div className="flex items-center gap-2 mb-1">
                  <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Request to join
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5 leading-relaxed">
                  Search by organization name or slug. An admin must approve your request.
                </p>

                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-9 rounded-lg border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                {/* Live Search Results List */}
                {searchQuery.trim().length > 0 && (
                  <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60 rounded-lg border border-slate-200/70 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 max-h-48 overflow-y-auto">
                    {searching ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Searching organizations...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No organizations found for &quot;{searchQuery}&quot;
                      </div>
                    ) : (
                      searchResults.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {org.name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500">
                              @{org.slug}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleJoinOrg(org.slug)}
                            disabled={submitting}
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
                          >
                            Join Org
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer switch link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                Create a new organization instead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
