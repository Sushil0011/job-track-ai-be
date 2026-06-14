import type { FastifyInstance } from "fastify";
import { verifyToken } from "../../utils/jwt";
import { updateUser } from "./controller";
import { updateSchema } from "./schema";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: verifyToken }, async (request, res) => {
    res.send({
      message: "User data retrieved successfully",
      user: request.user, // Send back the user info from the token
    });
  });

  fastify.patch(
    "/",
    { preHandler: verifyToken, schema: updateSchema },
    updateUser,
  );
}
