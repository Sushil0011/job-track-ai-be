import fp from "fastify-plugin";
import type {
  FastifyPluginAsync,
  FastifyError,
  FastifyRequest,
  FastifyReply,
} from "fastify";

interface PostgresError extends FastifyError {
  code: string;
  detail?: string;
  constraint?: string;
}

const globalErrorHandler: FastifyPluginAsync = async (fastify, opts) => {
  fastify.setErrorHandler(
    (
      error: FastifyError | PostgresError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      // Keep logging for backend visibility
      request.log.error(error);

      // 1. Handle Fastify Schema Validation Errors (400)
      if (error.validation) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: "Invalid input data",
          details: error.validation.map((err) => ({
            field:
              err.instancePath.replace("/", "") ||
              (err.params as any)?.missingProperty ||
              "unknown",
            message: err.message,
          })),
        });
      }

      // Default to the thrown status code (e.g., from AppError(404)) or 500
      let statusCode = error.statusCode || 500;
      let message = error.message;

      const pgError = error as PostgresError;

      // 2. Map PostgreSQL Native Errors to HTTP Status Codes
      if (pgError.code) {
        switch (pgError.code) {
          case "23505": // Unique Constraint Violation
            statusCode = 409; // Conflict
            const match = pgError.detail?.match(/Key \((.*?)\)=/);
            const conflictKey = match ? match[1] : null;

            switch (conflictKey) {
              case "email":
                message = "A user with this email already exists.";
                break;
              case "agency_id":
                message = "This agency profile has already been initialized.";
                break;
              case "owner":
                message = "You already have an active agency draft.";
                break;
              default:
                message = "Duplicate entry found.";
                break;
            }
            break;

          case "23503": // Foreign Key Violation
            // Triggered when trying to delete something still in use, or referencing something that doesn't exist
            statusCode = 409; // Conflict
            message =
              "Referenced record does not exist or is currently in use.";
            break;

          case "23502": // Not Null Violation
            statusCode = 400; // Bad Request
            message = "A required database field is missing.";
            break;

          case "22P02": // Invalid Text Representation (e.g., passing a bad UUID)
            statusCode = 400; // Bad Request
            message = "Invalid data format provided to the database.";
            break;

          case "42P01": // Undefined Table (Dev error, usually missing migration)
            statusCode = 500;
            message = "Database configuration error.";
            break;
        }
      }

      // 3. Return final formatted response
      return reply.status(statusCode).send({
        success: false,
        statusCode,
        // Mask the message for 500s to prevent leaking DB schema details to the client
        message: statusCode >= 500 ? "Internal Server Error" : message,
      });
    },
  );
};

export default fp(globalErrorHandler);
