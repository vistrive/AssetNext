// server/services/openauditScheduler.ts
import cron from "node-cron";
import { syncOpenAuditFirstPage } from "./openauditSync";
import { log } from "../vite"; // you already use this logger in index.ts

const LOCK = { running: false };

export function startOpenAuditScheduler() {
  const enabled =
    (process.env.OA_SYNC_ENABLED ?? "false").toLowerCase() === "true";
  if (!enabled) {
    log("OA sync scheduler disabled (set OA_SYNC_ENABLED=true to enable).");
    return;
  }

  const cronExp = process.env.OA_SYNC_CRON ?? "*/1 * * * *"; // every minute
  const tenantId = process.env.OA_TENANT_ID;
  const limit = parseInt(process.env.OA_SYNC_LIMIT ?? "100", 10);

  if (!tenantId) {
    log("OA sync scheduler cannot start: OA_TENANT_ID is not set.");
    return;
  }

  cron.schedule(cronExp, async () => {
    if (LOCK.running) {
      log("OA sync skipped: previous run still in progress.");
      return;
    }
    LOCK.running = true;
    const started = Date.now();
    try {
      const result = await syncOpenAuditFirstPage(tenantId, limit);
      log(
        `OA sync OK: imported=${result.imported}/${result.total} in ${
          Date.now() - started
        }ms`
      );
    } catch (err: any) {
      console.error("OA sync error (scheduled):", err);
      log("OA sync error (scheduled): " + (err?.message ?? String(err)));
    } finally {
      LOCK.running = false;
    }
  });

  log(`OA sync scheduler started (cron="${cronExp}", limit=${limit}).`);
}
