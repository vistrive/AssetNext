// server/services/openauditScheduler.ts
import { log } from "../vite";

export function startOpenAuditScheduler() {
  // NOTE: With the new approach, we're not syncing from OpenAudit to apply org filters.
  // Instead, devices are ONLY added to our database when enrolled through org-specific enrollment URLs.
  // OpenAudit serves only as a central device collector (all in default org).
  // Our application maintains organization boundaries through tenantId in our database.
  log("OA sync scheduler: Sync disabled - using enrollment-based device tracking.");
  log("Devices are added to organizations only through enrollment, not background sync.");
}
