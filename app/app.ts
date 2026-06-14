import Fastify from "fastify";
import cors from "@fastify/cors";
import routes from "./routes";
import globalErrorHandler from "./error";
import fastifyJwt from "@fastify/jwt";
import { env } from "./config/env";
import { sendSuccess } from "./utils/apiResponse";

export const buildApp = async () => {
  const fastify = Fastify({
    logger: env.isTest
      ? false
      : {
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              colorize: true,
            },
          },
        },
  });

  await fastify.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await fastify.register(globalErrorHandler);
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  fastify.get("/", async (_request, reply) => {
    return sendSuccess(reply, {
      message: "JobTrack AI Fastify API is running!",
    });
  });

  await fastify.register(routes, { prefix: "v1" });

  return fastify;
};
