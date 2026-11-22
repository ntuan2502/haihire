"use client";

import { Suspense } from "react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CandidatesView } from "./candidates-view";

export default function CandidatesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CandidatesView />
    </Suspense>
  );
}
