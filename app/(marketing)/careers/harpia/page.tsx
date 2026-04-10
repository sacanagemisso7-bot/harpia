import { redirect } from "next/navigation";

import { brandPaths } from "@/lib/brand";

export default function HarpiaCareersAliasPage() {
  redirect(brandPaths.legacyCareersDemo);
}
