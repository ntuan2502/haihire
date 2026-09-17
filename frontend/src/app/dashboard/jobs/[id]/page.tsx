"use client";

import { useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

function JobDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  useEffect(() => {
    if (jobId) {
      const qs = searchParams.toString();
      const target = `/dashboard/jobs/${jobId}/pipeline${qs ? `?${qs}` : ""}`;
      router.replace(target);
    }
  }, [jobId, searchParams, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <LoadingSpinner />
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JobDetailRedirect />
    </Suspense>
  );
}
