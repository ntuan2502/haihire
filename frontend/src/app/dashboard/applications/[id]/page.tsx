"use client";

import { AuthGuard } from "@/components/shared/auth-guard";
import { ApplicationDetailView } from "./application-detail-view";

export default function ApplicationDetailPage() {
  return (
    <AuthGuard>
      <ApplicationDetailView />
    </AuthGuard>
  );
}
