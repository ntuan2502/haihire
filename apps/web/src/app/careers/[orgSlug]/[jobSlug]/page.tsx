import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { extractPlainTextFromHtml, toDateOnlyString } from "@haihire/shared";
import { JobDetailsClient } from "@/components/careers/job-details-client";
import { JobClosed } from "./job-closed";
import type { Job, Organization } from "@/types";

interface PageProps {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}

export const dynamic = "force-dynamic";

const getApiBase = () => {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3001"
  );
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
    const res = await fetch(
      `${getApiBase()}/organizations/public/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { orgSlug, jobSlug } = await params;
  const [job, org] = await Promise.all([
    fetchJob(orgSlug, jobSlug),
    fetchOrg(orgSlug),
  ]);

  if (!job || job.status === "DRAFT") {
    return {
      title: "Job Not Found | HaiHire Careers",
      description:
        "The requested job opening could not be found or has expired.",
    };
  }

  const orgName = org?.name || orgSlug;
  const isClosed = job.status === "CLOSED";
  const title = isClosed
    ? `[Closed] ${job.title} at ${orgName} | HaiHire Careers`
    : `${job.title} at ${orgName} | HaiHire Careers`;
  const cleanDescription = extractPlainTextFromHtml(
    job.description || "",
  ).slice(0, 160);

  return {
    title,
    description: cleanDescription,
    openGraph: {
      title: isClosed
        ? `[Closed] ${job.title} - ${orgName}`
        : `${job.title} - ${orgName}`,
      description: cleanDescription,
      type: "article",
      url: `/careers/${orgSlug}/${jobSlug}`,
      siteName: "HaiHire Enterprise ATS",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: cleanDescription,
    },
  };
}

export default async function CareerJobSlugPage({ params }: PageProps) {
  const { orgSlug, jobSlug } = await params;
  const [job, org] = await Promise.all([
    fetchJob(orgSlug, jobSlug),
    fetchOrg(orgSlug),
  ]);

  if (!job) {
    notFound();
  }

  if (job.status === "DRAFT") {
    notFound();
  }

  if (job.status === "CLOSED") {
    return <JobClosed job={job} org={org} orgSlug={orgSlug} />;
  }

  const orgName = org?.name || orgSlug;
  const jsonLdLogoUrl = org?.logoUrl
    ? org.logoUrl.startsWith("http")
      ? org.logoUrl
      : `/api${org.logoUrl.startsWith("/") ? org.logoUrl : `/${org.logoUrl}`}`
    : null;

  const validThrough = toDateOnlyString(job.applicationDeadline);

  // Structured Data (JSON-LD) for Google Jobs Indexing
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.createdAt
      ? new Date(job.createdAt).toISOString()
      : new Date().toISOString(),
    ...(validThrough ? { validThrough } : {}),
    employmentType: job.type,
    hiringOrganization: {
      "@type": "Organization",
      name: orgName,
      sameAs: `/careers/${orgSlug}`,
      ...(jsonLdLogoUrl ? { logo: jsonLdLogoUrl } : {}),
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
            currency: org?.defaultCurrency || "VND",
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Semantic server-rendered content for crawlers & robots */}
      <div className="sr-only" aria-hidden="true">
        <h1>{`${job.title} at ${orgName}`}</h1>
        <p>{`Department: ${job.department} | Location: ${job.location} | Type: ${job.type}`}</p>
        <div>
          <h2>Job Description</h2>
          <p>{extractPlainTextFromHtml(job.description || "")}</p>
        </div>
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
