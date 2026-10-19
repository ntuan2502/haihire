"use client";

import { AuthGuard } from "@/components/shared/auth-guard";
import { CandidateDetailView } from "./candidate-detail-view";

export default function CandidateDetailPage() {
  return (
    <AuthGuard>
      <CandidateDetailView />
    </AuthGuard>
  );
}
