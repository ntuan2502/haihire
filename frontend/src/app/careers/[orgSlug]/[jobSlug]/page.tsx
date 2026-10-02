import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobDetailsClient } from "@/components/careers/job-details-client";
import type { Job, Organization } from "@/types";

interface PageProps {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}

const getApiBase = () => {
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:13001";
};

async function fetchJob(orgSlug: string, jobSlug: string): Promise<Job | null> {
  try {
    const res = await fetch(
      `${getApiBase()}/jobs/careers/${encodeURIComponent(orgSlug)}/${encodeURIComponent(jobSlug)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgSlug, jobSlug } = await params;
  const [job, org] = await Promise.all([fetchJob(orgSlug, jobSlug), fetchOrg(orgSlug)]);

  if (!job) {
    return {
      title: "Job Not Found | HaiHire Careers",
      description: "The requested job opening could not be found or has expired.",
    };
  }

  const orgName = org?.name || orgSlug;
  const title = `${job.title} at ${orgName} | HaiHire Careers`;
  const cleanDescription = (job.description || "").slice(0, 160).replace(/\s+/g, " ").trim();

  return {
    title,
    description: cleanDescription,
    openGraph: {
      title: `${job.title} - ${orgName}`,
      description: cleanDescription,
      type: "article",
      url: `/careers/${orgSlug}/${jobSlug}`,
      siteName: "HaiHire Enterprise ATS",
    },
    twitter: {
      card: "summary_large_image",
      title: `${job.title} at ${orgName}`,
      description: cleanDescription,
    },
  };
}

export default async function CareerJobSlugPage({ params }: PageProps) {
  const { orgSlug, jobSlug } = await params;
  const [job, org] = await Promise.all([fetchJob(orgSlug, jobSlug), fetchOrg(orgSlug)]);

  if (!job) {
    notFound();
  }

  const orgName = org?.name || orgSlug;

  // Structured Data (JSON-LD) for Google Jobs Indexing
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
    employmentType: job.type,
    hiringOrganization: {
      "@type": "Organization",
      name: orgName,
      sameAs: `/careers/${orgSlug}`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
      },
    },
    ...(job.salaryRange
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "VND",
            value: job.salaryRange,
          },
        }
      : {}),
  };

  return (
    <>
      {/* Schema.org JobPosting Structured Data for SEO / Search Engine Preview */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Semantic server-rendered content for crawlers & robots */}
      <div className="sr-only" aria-hidden="true">
        <h1>{`${job.title} at ${orgName}`}</h1>
        <p>{`Department: ${job.department} | Location: ${job.location} | Type: ${job.type}`}</p>
        <div>
          <h2>Job Description</h2>
          <p>{job.description}</p>
        </div>
        {job.requirements && (
          <div>
            <h2>Requirements</h2>
            <p>{job.requirements}</p>
          </div>
        )}
      </div>

      {/* Interactive client application & apply modal */}
      <JobDetailsClient
        initialJob={job}
        initialOrg={org}
        orgSlug={orgSlug}
        jobSlug={jobSlug}
      />
    </>
  );
}
