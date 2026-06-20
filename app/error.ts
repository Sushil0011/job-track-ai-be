import fp from "fastify-plugin";
import type {
  FastifyPluginAsync,
  FastifyError,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { env } from "./config/env";

type PostgresLikeError = {
  code?: string;
  detail?: string;
  constraint?: string;
  constraint_name?: string;
};

const isPostgresError = (error: unknown): error is PostgresLikeError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as PostgresLikeError).code === "string" &&
    /^[0-9A-Z]{5}$/.test((error as PostgresLikeError).code!)
  );
};

const getPostgresError = (error: unknown): PostgresLikeError | null => {
  let current: unknown = error;
  const visited = new Set<unknown>();

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if (isPostgresError(current)) {
      return current;
    }
    current = (current as { cause?: unknown }).cause;
  }

  return null;
};

const mapPostgresError = (
  pgError: PostgresLikeError,
): { statusCode: number; message: string } | null => {
  switch (pgError.code) {
    case "23505": {
      const detailMatch = pgError.detail?.match(/Key \((.*?)\)=/);
      const conflictKey = detailMatch?.[1];
      const constraint = pgError.constraint ?? pgError.constraint_name ?? "";
      const isEmailConflict =
        conflictKey === "email" || constraint.toLowerCase().includes("email");

      return {
        statusCode: 409,
        message: isEmailConflict
          ? "A user with this email already exists."
          : "Duplicate entry found.",
      };
    }
    case "23503":
      return {
        statusCode: 409,
        message: "Referenced record does not exist or is currently in use.",
      };
    case "23502":
      return {
        statusCode: 400,
        message: "A required database field is missing.",
      };
    case "22P02":
      return {
        statusCode: 400,
        message: "Invalid data format provided to the database.",
      };
    case "42P01":
      return {
        statusCode: 500,
        message: "Database configuration error.",
      };
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

      const pgError = getPostgresError(error);
      if (pgError) {
        const mapped = mapPostgresError(pgError);
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
