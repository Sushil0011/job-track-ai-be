import type { FastifyError } from "fastify";

export const httpError = (message: string, statusCode: number): FastifyError => {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  return error;
};
