import { redirect } from "next/navigation";

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function JobDetailPage({
  params,
  searchParams,
}: JobDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined) qs.append(key, item);
      }
    } else if (value !== undefined) {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  redirect(
    `/jobs/${encodeURIComponent(id)}/pipeline${query ? `?${query}` : ""}`,
  );
}
