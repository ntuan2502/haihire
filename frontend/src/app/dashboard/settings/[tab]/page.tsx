"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useMyOrg } from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function SubSettingsPage() {
  const params = useParams();
  const rawTab = params?.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : (rawTab as string);

  const { user, logout } = useAuth();
  const { data: org } = useMyOrg();

  const [appHost, setAppHost] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppHost(window.location.host);
    }
  }, []);

  const displayHost = appHost || "localhost:3000";
  const orgSlug = org?.slug || user?.organization?.slug || "workspace";

  if (tab === "localization") {
    return (
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
    );
  }

  if (tab === "notifications") {
    return (
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
                Receive instant email notifications when a candidate applies.
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
                A summary of pipeline movements and scheduled interviews every
                morning.
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
    );
  }

  if (tab === "career-page") {
    return (
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
                {displayHost}/{orgSlug}
              </p>
            </div>

            <Link
              href="/dashboard/jobs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <span>Preview</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Jobs published with status &quot;Published&quot; will automatically
            appear on your public career board.
          </p>
        </div>
      </div>
    );
  }

  if (tab === "billing") {
    return (
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
                Upgrade to Pro to post unlimited jobs and access AI candidate
                ranking.
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
    );
  }

  if (tab === "account") {
    return (
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
    );
  }

  // Default: Enterprise locked tabs (integrations, ai-configuration, privacy-retention, sso)
  const tabTitles: Record<string, { label: string; sublabel: string }> = {
    integrations: {
      label: "Integrations",
      sublabel: "Calendar & services",
    },
    "ai-configuration": {
      label: "AI Configuration",
      sublabel: "Models & API keys",
    },
    "privacy-retention": {
      label: "Privacy & Retention",
      sublabel: "Retention policy",
    },
    sso: {
      label: "Single Sign-On (SSO)",
      sublabel: "Enterprise SSO and SAML authentication",
    },
  };

  const titleInfo = tabTitles[tab] || {
    label: "Settings",
    sublabel: "Organization configuration",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>{titleInfo.label}</span>
          <Lock className="h-4 w-4 text-slate-400" />
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {titleInfo.sublabel}
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
          This module provides enterprise-level integrations, retention safeguards,
          and dedicated custom AI models.
        </p>
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-5 h-9"
        >
          View Upgrade Plans
        </Link>
      </div>
    </div>
  );
}
