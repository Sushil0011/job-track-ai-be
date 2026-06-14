import type { FastifyInstance, FastifyPluginOptions } from "fastify";

export default async function jobRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    
  fastify.get("/", async (request, reply) => {
    return reply.send({
      status: "success",
      message: "🚀 JobTrack AI Fastify API is running!",
    });
  });
}
