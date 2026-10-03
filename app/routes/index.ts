import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import authRoutes from "../api/auth/route";
import userRoutes from "../api/user/route";
import jobsRoutes from "../api/jobs/route";
import notesRoutes from "../api/notes/route";
import remindersRoutes from "../api/reminders/route";
import analyticsRoutes from "../api/analytics/route";
import aiRoutes from "../api/ai/route";
import cronRoutes from "../api/cron/route";

export default async function routes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.register(authRoutes, { prefix: "auth" });
  fastify.register(userRoutes, { prefix: "user" });
  fastify.register(jobsRoutes, { prefix: "jobs" });
  // Keep the original singular prefix as a compatibility alias.
  fastify.register(jobsRoutes, { prefix: "job" });
  fastify.register(notesRoutes, { prefix: "notes" });
  fastify.register(remindersRoutes, { prefix: "reminders" });
  fastify.register(analyticsRoutes, { prefix: "analytics" });
  fastify.register(aiRoutes, { prefix: "ai" });
  fastify.register(cronRoutes, { prefix: "cron" });
}
