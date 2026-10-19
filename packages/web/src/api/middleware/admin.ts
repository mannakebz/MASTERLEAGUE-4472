import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { auth } from "../auth";
export const admin = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED", { message: "Sign in to continue." });
  const email = process.env.MASTER_LEAGUE_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || session.user.email.toLowerCase() !== email || !session.user.emailVerified)
    throw new ORPCError("FORBIDDEN", { message: "A verified assigned administrator is required." });
  return next({ context: { user: session.user } });
});
