import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { HarpiaLanding } from "@/components/marketing/harpia-landing";
import { SiteChrome } from "@/components/marketing/site-chrome";

export default async function MarketingPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <SiteChrome>
      <HarpiaLanding />
    </SiteChrome>
  );
}
