import { ok } from "@/lib/api";
import { withUser } from "@/server/handler";
import { listAllTickets } from "@/server/tickets";

export const GET = withUser("admin", async () => ok(await listAllTickets()));
