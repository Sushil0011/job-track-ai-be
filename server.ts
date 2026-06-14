import { buildApp } from "./app/app";

const start = async () => {
  try {
    const fastify = await buildApp();
    await fastify.listen({ port: 8080, host: "0.0.0.0" });
    console.log("Fastify backend running on http://localhost:8080");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
