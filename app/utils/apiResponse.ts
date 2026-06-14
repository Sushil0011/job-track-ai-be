import type { FastifyReply } from "fastify";
import type { ApiSuccess } from "../types/api.js";

export const sendSuccess = <T>(
  reply: FastifyReply,
  data?: T,
  statusCode = 200,
  message?: string,
) => {
  const body: ApiSuccess<T> = {
    success: true,
    statusCode,
  };
  if (data !== undefined) {
    body.data = data;
  }
  if (message) {
    body.message = message;
  }
  return reply.status(statusCode).send(body);
};
