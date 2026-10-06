import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrgCareersClient } from "@/components/careers/org-careers-client";
import type { Organization, Job } from "@/types";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

const getApiBase = () => {
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:13001";
};

async function fetchOrg(slug: string): Promise<Organization | null> {
  try {
    const res = await fetch(`${getApiBase()}/organizations/public/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchJobs(orgSlug: string): Promise<Job[]> {
  try {
    const res = await fetch(
      `${getApiBase()}/jobs?organizationSlug=${encodeURIComponent(orgSlug)}&status=PUBLISHED&limit=1000`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = await fetchOrg(orgSlug);

  const orgName = org?.name || orgSlug;
  const title = `Careers at ${orgName} | Join Our Team`;
  const description = `Explore open job positions and career opportunities at ${orgName}. Apply online directly.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/careers/${orgSlug}`,
      siteName: "HaiHire Enterprise ATS",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function OrgCareersPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const [org, jobs] = await Promise.all([fetchOrg(orgSlug), fetchJobs(orgSlug)]);

  if (!org) {
    notFound();
  }

  return (
    <>
      {/* Semantic server-rendered content for Search Engines & Robots */}
      <div className="sr-only" aria-hidden="true">
        <h1>{`Careers at ${org.name || orgSlug}`}</h1>
        <p>{`Explore open job opportunities at ${org.name || orgSlug}. We are hiring talented professionals.`}</p>
        <ul>
          {jobs.map((job) => (
            <li key={job.id}>
              <a href={`/careers/${orgSlug}/${job.id}`}>{`${job.title} - ${job.department} (${job.location})`}</a>
              <p>{job.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Interactive client application */}
      <OrgCareersClient initialOrg={org} initialJobs={jobs} orgSlug={orgSlug} />
    </>
  );
}
