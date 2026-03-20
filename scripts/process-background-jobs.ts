import { processPendingBackgroundJobs } from "@/modules/background-jobs/service";
import { scheduleWatchtowerSweepJobs } from "@/modules/watchtower/service";

async function main() {
  const scheduled = await scheduleWatchtowerSweepJobs();
  const processed = await processPendingBackgroundJobs({
    limit: 25
  });
  console.log(JSON.stringify({ scheduled, processed }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
