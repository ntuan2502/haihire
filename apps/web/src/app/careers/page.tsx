import type { Metadata } from "next";
import { CareersDirectoryClient } from "@/components/careers/careers-directory-client";
import type { Job } from "@/types";

export const dynamic = "force-dynamic";

const getApiBase = () => {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3001"
  );
};

async function fetchPublicJobs(): Promise<Job[]> {
  try {
    const res = await fetch(`${getApiBase()}/jobs/public?limit=1000`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "Career Opportunities | HaiHire ATS",
  description:
    "Browse open roles across verified companies powered by HaiHire.",
};

export default async function CareersDirectoryPage() {
  const jobs = await fetchPublicJobs();

  return <CareersDirectoryClient initialJobs={jobs} />;
}
