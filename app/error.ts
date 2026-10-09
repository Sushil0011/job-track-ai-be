import fp from "fastify-plugin";
import type {
  FastifyPluginAsync,
  FastifyError,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { env } from "./config/env";

type MongoLikeError = {
  code?: number | string;
  name?: string;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
  message?: string;
};

const isMongoError = (error: unknown): error is MongoLikeError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (typeof (error as MongoLikeError).code === "number" ||
      (error as MongoLikeError).code === "11000")
  );
};

const getMongoError = (error: unknown): MongoLikeError | null => {
  let current: unknown = error;
  const visited = new Set<unknown>();

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if (isMongoError(current)) {
      return current;
    }
    current = (current as { cause?: unknown }).cause;
  }

  return null;
};

const mapMongoError = (
  mongoError: MongoLikeError,
): { statusCode: number; message: string } | null => {
  switch (mongoError.code) {
    case 11000:
    case "11000": {
      const conflictKey =
        mongoError.keyPattern && Object.keys(mongoError.keyPattern)[0];
      const keyValueKey =
        mongoError.keyValue && Object.keys(mongoError.keyValue)[0];
      const isEmailConflict =
        conflictKey === "email" ||
        keyValueKey === "email" ||
        Boolean(mongoError.message?.includes("email"));

      return {
        statusCode: 409,
        message: isEmailConflict
          ? "A user with this email already exists."
          : "Duplicate entry found.",
      };
    }
    default:
      return null;
  }
};

const globalErrorHandler: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      request.log.error(error);

      if (error.validation) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: "Invalid input data",
          details: error.validation.map((err) => ({
            field:
              err.instancePath.replace("/", "") ||
              (err.params as { missingProperty?: string })?.missingProperty ||
              "unknown",
            message: err.message ?? "Invalid value",
          })),
        });
      }

      let statusCode = error.statusCode ?? 500;
      let message = error.message || "Internal Server Error";

      const mongoError = getMongoError(error);
      if (mongoError) {
        const mapped = mapMongoError(mongoError);
        if (mapped) {
          statusCode = mapped.statusCode;
          message = mapped.message;
        }
      }

      if (statusCode >= 500 && !env.isDevelopment) {
        message = "Internal Server Error";
      }

      return reply.status(statusCode).send({
        success: false,
        statusCode,
        message,
      });
    },
  );
};

export default fp(globalErrorHandler);
