import type { FastifyInstance } from "fastify";
import { verifyToken } from "../../utils/jwt";
import { getUser, updateUser } from "./controller";
import { updateSchema } from "./schema";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: verifyToken }, getUser);

  fastify.patch(
    "/",
    { preHandler: verifyToken, schema: updateSchema },
    updateUser,
  );
}
