import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "crypto";
import { httpError } from "./httpError";

export const generateToken = (
  fastify: FastifyInstance,
  payload: { id: string; email: string; name: string },
  expiresIn: string,
) => {
  return fastify.jwt.sign(payload, { expiresIn });
};

export const generateRefreshToken = () => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  const token = crypto.randomBytes(32).toString("hex");
  return { token, expiryDate };
};

export const generateResetToken = () => {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1);
  const token = crypto.randomBytes(32).toString("hex");
  return { token, expiryDate };
};

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const verifyToken = async (
  request: FastifyRequest,
  _reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
  } catch {
    throw httpError("Invalid token or token expired", 401);
  }
};
