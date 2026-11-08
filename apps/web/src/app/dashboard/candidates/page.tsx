"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CandidatesView } from "./candidates-view";

export default function CandidatesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <CandidatesView />
      </Suspense>
    </AuthGuard>
  );
}
