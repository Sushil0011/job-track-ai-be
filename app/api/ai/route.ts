import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { env } from "../../config/env";
import { verifyToken } from "../../utils/jwt";
import { analyzeResumeController, generateFollowup, generateQuestions } from "./controller";
import { followupSchema, questionsSchema } from "./schema";

export default async function aiRoutes(fastify: FastifyInstance) {
  if (!env.isTest) {
    await fastify.register(rateLimit, {
      global: false,
      hook: "preHandler",
      errorResponseBuilder: (_request, context) => ({
        success: false,
        statusCode: 429,
        message: `AI rate limit exceeded. Retry in ${context.after}`,
      }),
    });
  }

  const rateLimitConfig = (max: number) =>
    env.isTest ? {} : { rateLimit: { max, timeWindow: "1 hour" } };

  fastify.post(
    "/questions",
    {
      preHandler: verifyToken,
      schema: questionsSchema,
      config: rateLimitConfig(10),
    },
    generateQuestions,
  );
  fastify.post(
    "/resume-analysis",
    {
      preHandler: verifyToken,
      config: rateLimitConfig(5),
    },
    analyzeResumeController,
  );
  fastify.post(
    "/followup-email",
    {
      preHandler: verifyToken,
      schema: followupSchema,
      config: rateLimitConfig(10),
    },
    generateFollowup,
  );
}
