import type { FastifyRequest, FastifyReply } from "fastify";
import { getUserInfo, updateUserInfo } from "./service";
import { sendSuccess } from "../../utils/apiResponse";

export const updateUser = async (req: FastifyRequest, res: FastifyReply) => {
  const user = await updateUserInfo(req.user.id, req.body as { name: string });
  return sendSuccess(res, { user }, 200, "User updated successfully");
};

export const getUser = async (req: FastifyRequest, res: FastifyReply) => {
  const user = await getUserInfo(req.user.id);
  return sendSuccess(res, { user }, 200, "User data retrieved successfully");
};
