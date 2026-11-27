"use client";

import { Suspense } from "react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ApplicationDetailView } from "./application-detail-view";

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ApplicationDetailView />
    </Suspense>
  );
}
