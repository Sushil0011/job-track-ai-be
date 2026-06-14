import type { FastifyRequest, FastifyReply } from "fastify";
import { updateUserInfo } from "./service";
import { sendSuccess } from "../../utils/apiResponse";

export const updateUser = async (req: FastifyRequest, res: FastifyReply) => {
  const userId = req.user.id;
  await updateUserInfo(userId, req.body);
  return sendSuccess(res, { user: req.user }, 200, "User updated successfully");
};

export const getUser = async (req: FastifyRequest, res: FastifyReply) => {
  return sendSuccess(res, { user: req.user }, 200, "User data retrieved successfully");
};
