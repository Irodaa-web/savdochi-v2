import { ok } from "@/lib/api";
import { listAudit } from "@/server/admin";
import { withUser } from "@/server/handler";

export const GET = withUser("admin", async () => ok(await listAudit()));
