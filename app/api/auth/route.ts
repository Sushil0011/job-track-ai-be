import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import {
  login,
  signup,
  refreshToken,
  changePasswordHandler,
  logout,
} from "./controller";
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "./schema";
import { verifyToken } from "../../utils/jwt";
import { env } from "../../config/env";

const rateLimitError = (_request: unknown, context: { after: string }) => ({
  success: false,
  statusCode: 429,
  message: `Rate limit exceeded. Retry in ${context.after}`,
});

export default async function authRoutes(fastify: FastifyInstance) {
  if (!env.isTest) {
    await fastify.register(rateLimit, {
      global: false,
      hook: "preHandler",
      errorResponseBuilder: rateLimitError,
    });
  }

  const rateLimitConfig = (max: number, timeWindow: string) =>
    env.isTest ? {} : { rateLimit: { max, timeWindow } };

  fastify.post("/signup", {
    schema: signupSchema,
    config: rateLimitConfig(10, "1 hour"),
    handler: signup,
  });

  fastify.post("/login", {
    schema: loginSchema,
    config: rateLimitConfig(5, "15 minutes"),
    handler: login,
  });

  fastify.post("/refresh-token", {
    schema: refreshTokenSchema,
    config: rateLimitConfig(30, "15 minutes"),
    handler: refreshToken,
  });

  fastify.post("/logout", {
    preHandler: verifyToken,
    config: rateLimitConfig(30, "15 minutes"),
    handler: logout,
  });

  fastify.post("/change-password", {
    preHandler: verifyToken,
    schema: changePasswordSchema,
    config: rateLimitConfig(5, "1 hour"),
    handler: changePasswordHandler,
  });
}
