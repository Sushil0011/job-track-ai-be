import type { FastifyInstance } from "fastify";
import {
  login,
  signup,
  refreshToken,
  forgotPassword,
  resetPasswordHandler,
} from "./controller";
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schema";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/signup", { schema: signupSchema }, signup);
  fastify.post("/login", { schema: loginSchema }, login);
  fastify.post("/refresh-token", { schema: refreshTokenSchema }, refreshToken);
  fastify.post(
    "/forgot-password",
    { schema: forgotPasswordSchema },
    forgotPassword,
  );
  fastify.post(
    "/reset-password",
    { schema: resetPasswordSchema },
    resetPasswordHandler,
  );
}
