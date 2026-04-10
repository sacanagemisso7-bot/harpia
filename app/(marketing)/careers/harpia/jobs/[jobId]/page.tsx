import { redirect } from "next/navigation";

import { brandPaths } from "@/lib/brand";

export default async function HarpiaCareersJobAliasPage({
  params
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  redirect(`${brandPaths.legacyCareersDemo}/jobs/${jobId}`);
}
