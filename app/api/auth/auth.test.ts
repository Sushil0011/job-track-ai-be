import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

const sentResetEmails: { to: string; resetUrl: string }[] = [];

vi.mock("../../services/email", () => ({
  sendPasswordResetEmail: vi.fn(
    async ({ to, resetUrl }: { to: string; resetUrl: string }) => {
      sentResetEmails.push({ to, resetUrl });
    },
  ),
}));

const testEmail = `test-${Date.now()}@example.com`;
const testPassword = "password123";
const testName = "Test User";

describe("Auth API", () => {
  let app: FastifyInstance;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
    await app.close();
  });

  it("signup returns tokens without password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: {
        email: testEmail,
        password: testPassword,
        name: testName,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
    expect(body.data.password).toBeUndefined();
    expect(body.data.email).toBe(testEmail);

    accessToken = body.data.token;
    refreshToken = body.data.refreshToken;
    userId = body.data.id;
  });

  it("signup rejects duplicate email", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: {
        email: testEmail,
        password: testPassword,
        name: testName,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      success: false,
      statusCode: 409,
      message: "A user with this email already exists.",
    });
  });

  it("login creates a new refresh token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testEmail, password: testPassword },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();

    accessToken = body.data.token;
    refreshToken = body.data.refreshToken;
  });

  it("refresh returns only a new access token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh-token",
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.refreshToken).toBeUndefined();
    expect(body.data.id).toBeUndefined();

    accessToken = body.data.token;
  });

  it("refresh token can be reused until it expires", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh-token",
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.token).toBeDefined();
    expect(response.json().data.refreshToken).toBeUndefined();
  });

  it("protected route returns unified 401 without token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/user",
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBeDefined();
  });

  it("protected route works with valid token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/user",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testEmail);
  });

  it("logout clears refresh token", async () => {
    const loginResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testEmail, password: testPassword },
    });
    const sessionToken = loginResponse.json().data.refreshToken;
    const jwt = loginResponse.json().data.token;

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh-token",
      payload: { refreshToken: sessionToken },
    });
    expect(refreshResponse.statusCode).toBe(401);
  });

  it("change-password updates password with old and new password", async () => {
    const loginResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testEmail, password: testPassword },
    });
    const jwt = loginResponse.json().data.token;

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/change-password",
      headers: { authorization: `Bearer ${jwt}` },
      payload: {
        oldPassword: testPassword,
        newPassword: "newpassword123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const oldPasswordLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testEmail, password: testPassword },
    });
    expect(oldPasswordLogin.statusCode).toBe(401);

    const newPasswordLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testEmail, password: "newpassword123" },
    });
    expect(newPasswordLogin.statusCode).toBe(200);
    accessToken = newPasswordLogin.json().data.token;
  });

  it("change-password rejects when new password matches old password", async () => {
    const currentPassword = "newpassword123";
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/change-password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        oldPassword: currentPassword,
        newPassword: currentPassword,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe(
      "New password must be different from current password",
    );
  });

  it("forgot-password sends reset email for existing user", async () => {
    sentResetEmails.length = 0;

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/forgot-password",
      payload: { email: testEmail },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
    expect(response.json().message).toBe(
      "If an account exists with that email, a reset link has been sent.",
    );
    expect(sentResetEmails).toHaveLength(1);
    expect(sentResetEmails[0]?.to).toBe(testEmail);
    expect(sentResetEmails[0]?.resetUrl).toContain("token=");
  });

  it("forgot-password returns same response for unknown email", async () => {
    sentResetEmails.length = 0;

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/forgot-password",
      payload: { email: "unknown@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toBe(
      "If an account exists with that email, a reset link has been sent.",
    );
    expect(sentResetEmails).toHaveLength(0);
  });

  it("reset-password updates password and invalidates sessions", async () => {
    sentResetEmails.length = 0;

    const preResetLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testEmail, password: "newpassword123" },
    });
    const oldRefreshToken = preResetLogin.json().data.refreshToken;

    await app.inject({
      method: "POST",
      url: "/v1/auth/forgot-password",
      payload: { email: testEmail },
    });

    const resetUrl = sentResetEmails[0]?.resetUrl ?? "";
    const token = new URL(resetUrl).searchParams.get("token");
    expect(token).toBeTruthy();

    const resetResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/reset-password",
      payload: { token, newPassword: "resetpassword123" },
    });

    expect(resetResponse.statusCode).toBe(200);
    expect(resetResponse.json().message).toBe("Password reset successfully.");

    const loginResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testEmail, password: "resetpassword123" },
    });
    expect(loginResponse.statusCode).toBe(200);
    accessToken = loginResponse.json().data.token;
    refreshToken = loginResponse.json().data.refreshToken;

    const oldSessionRefresh = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh-token",
      payload: { refreshToken: oldRefreshToken },
    });
    expect(oldSessionRefresh.statusCode).toBe(401);
  });

  it("reset-password rejects invalid token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/reset-password",
      payload: { token: "invalid-token", newPassword: "anotherpassword123" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe("Invalid or expired reset token");
  });
});
