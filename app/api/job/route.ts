import type { FastifyInstance } from "fastify";
import { sendSuccess } from "../../utils/apiResponse";

export default async function jobRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (_request, reply) => {
    return sendSuccess(reply, { message: "JobTrack AI job routes are running!" });
  });
}
