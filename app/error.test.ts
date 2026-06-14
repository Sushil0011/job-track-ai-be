import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import globalErrorHandler from "./error";
import { httpError } from "./utils/httpError";

const buildTestApp = async (
  handler: (req: unknown, reply: unknown) => Promise<void>,
) => {
  const app = Fastify({ logger: false });
  await app.register(globalErrorHandler);
  app.get("/test", handler);
  await app.ready();
  return app;
};

const drizzleDuplicateEmailError = () => {
  const pgError = Object.assign(new Error("duplicate key value"), {
    code: "23505",
    detail: "Key (email)=(user@example.com) already exists.",
    constraint_name: "user_email_unique",
  });

  return Object.assign(new Error("Failed query: insert into user"), {
    cause: pgError,
  });
};

describe("global error handler", () => {
  let app: FastifyInstance;

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("maps drizzle-wrapped duplicate email to 409", async () => {
    app = await buildTestApp(async () => {
      throw drizzleDuplicateEmailError();
    });

    const response = await app.inject({ method: "GET", url: "/test" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      success: false,
      statusCode: 409,
      message: "A user with this email already exists.",
    });
  });

  it("preserves httpError status and message", async () => {
    app = await buildTestApp(async () => {
      throw httpError("Invalid email or password", 401);
    });

    const response = await app.inject({ method: "GET", url: "/test" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      success: false,
      statusCode: 401,
      message: "Invalid email or password",
    });
  });

  it("returns validation errors as 400", async () => {
    app = Fastify({ logger: false });
    await app.register(globalErrorHandler);
    app.post(
      "/validate",
      {
        schema: {
          body: {
            type: "object",
            required: ["email"],
            properties: { email: { type: "string", format: "email" } },
          },
        },
      },
      async () => {},
    );
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/validate",
      payload: { email: "not-an-email" },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe("Invalid input data");
    expect(body.details).toBeDefined();
  });

  it("masks unknown errors as 500", async () => {
    app = await buildTestApp(async () => {
      throw new Error("something broke");
    });

    const response = await app.inject({ method: "GET", url: "/test" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
    });
  });
});
