import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import jobRoute from '../api/job/route'
import authRoutes from '../api/auth/route'
import userRoutes from "../api/user/route";

export default async function routes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.register(jobRoute, { prefix: "job" });
  fastify.register(authRoutes, { prefix: "auth" });
  fastify.register(userRoutes, { prefix: "user" });
}
