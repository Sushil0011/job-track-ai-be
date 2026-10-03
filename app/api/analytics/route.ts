import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "../../utils/jwt";
import { sendSuccess } from "../../utils/apiResponse";
import { getAnalyticsForUser } from "./service";

const getAnalytics = async (req: FastifyRequest, res: FastifyReply) => {
  const analytics = await getAnalyticsForUser(req.user.id);
  return sendSuccess(res, analytics);
};

export default async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: verifyToken }, getAnalytics);
}
