import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import routes from "./routes";
import globalErrorHandler from "./error";
import fastifyJwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { env } from "./config/env";
import { sendSuccess } from "./utils/apiResponse";
import { connectDB, disconnectDB } from "./db";

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

  await fastify.register(fastifyCookie);

  await fastify.register(globalErrorHandler);
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  await connectDB();
  fastify.addHook("onClose", async () => {
    await disconnectDB();
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
      fields: 5,
    },
  });

  fastify.get("/", async (_request, reply) => {
    return sendSuccess(reply, {
      message: "JobTrack AI Fastify API is running!",
    });
  });

  await fastify.register(routes, { prefix: "v1" });

  return fastify;
};
