import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import routes from "./app/routes";
import globalErrorHandler from "./app/error";
import fastifyJwt from "@fastify/jwt";

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z", // Adds a readable timestamp
        ignore: "pid,hostname", // Hides unnecessary process IDs to keep it clean
        colorize: true, // Adds colors for different log levels (Info, Error, etc.)
      },
    },
  },
});

// 1. Register CORS
// This strictly allows your Next.js frontend on port 3000 to talk to this backend
fastify.register(cors, {
  origin: "http://localhost:3000",
  credentials: true, // Required to accept Auth.js session cookies
});

// 2. Register Cookie Parser
fastify.register(cookie);
fastify.register(globalErrorHandler);
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "",
});

// 3. Health Check Route
// A simple endpoint to verify the server is running correctly
fastify.get("/", async (request, reply) => {
  return reply.send({
    status: "success",
    message: "🚀 JobTrack AI Fastify API is running!",
  });
});
fastify.register(routes, { prefix: "v1" });

// 4. Start the Server
const start = async () => {
  try {
    // Run on port 8080 to avoid clashing with Next.js on 3000
    await fastify.listen({ port: 8080, host: "0.0.0.0" });
    console.log("🚀 Fastify backend running on http://localhost:8080");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
