import { buildApp } from "./app/app";
import { env } from "./app/config/env";

const start = async () => {
  try {
    const fastify = await buildApp();
    await fastify.listen({ port: env.PORT, host: env.HOST });
    console.log("Fastify backend running ");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
