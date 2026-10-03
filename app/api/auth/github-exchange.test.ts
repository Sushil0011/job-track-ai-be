import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const authService = vi.hoisted(() => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  loginUser: vi.fn(),
  refreshSession: vi.fn(),
  changePassword: vi.fn(),
  revokeAllSessions: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPasswordWithToken: vi.fn(),
  loginWithGoogle: vi.fn(),
  createGithubOAuthState: vi.fn(),
  buildGithubAuthorizationUrl: vi.fn(),
  loginWithGithub: vi.fn(),
  createGithubLoginExchangeCode: vi.fn(),
  redeemGithubLoginExchangeCode: vi.fn(),
}));

vi.mock("./service", () => authService);

import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app";

describe("GitHub login exchange route", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates the one-time exchange code", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/github/exchange",
      payload: { code: "short" },
    });

    expect(response.statusCode).toBe(400);
    expect(authService.redeemGithubLoginExchangeCode).not.toHaveBeenCalled();
  });

  it("returns a session for a valid one-time code", async () => {
    authService.redeemGithubLoginExchangeCode.mockResolvedValue({
      user: { id: "user-1", email: "github@example.com", name: "GitHub User" },
      refreshToken: "refresh-token-value",
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/github/exchange",
      payload: { code: "a".repeat(43) },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      id: "user-1",
      email: "github@example.com",
      name: "GitHub User",
      refreshToken: "refresh-token-value",
    });
    expect(response.json().data.token).toEqual(expect.any(String));
    expect(authService.redeemGithubLoginExchangeCode).toHaveBeenCalledWith("a".repeat(43));
  });
});
