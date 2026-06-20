import type { FastifyRequest, FastifyReply } from "fastify";
import {
  createUser,
  findUserByEmail,
  loginUser,
  refreshSession,
  changePassword,
  revokeAllSessions,
  requestPasswordReset,
  resetPasswordWithToken,
  loginWithGoogle,
  createGithubOAuthState,
  buildGithubAuthorizationUrl,
  loginWithGithub,
} from "./service";
import type {
  changePasswordBody,
  forgotPasswordBody,
  GithubOAuthStateCookie,
  loginBody,
  refreshTokenBody,
  resetPasswordBody,
  signupBody,
} from "./type";
import { generateToken } from "../../utils/jwt";
import { sendSuccess } from "../../utils/apiResponse";
import { httpError } from "../../utils/httpError";
import { env } from "../../config/env";

const OAUTH_STATE_COOKIE = "oauth_state";
const ACCESS_TOKEN_COOKIE = "token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const authCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  path: "/",
};

const buildAuthData = (
  fastify: FastifyRequest["server"],
  user: { id: string; email: string; name: string },
  refreshToken: string,
) => {
  const token = generateToken(
    fastify,
    { email: user.email, id: user.id, name: user.name },
    "1h",
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token,
    refreshToken,
  };
};

export const login = async (req: FastifyRequest, res: FastifyReply) => {
  const user = await findUserByEmail(req.body as loginBody);
  console.log(user, "user");
  const session = await loginUser(user);

  return sendSuccess(
    res,
    buildAuthData(req.server, session.user, session.refreshToken),
  );
};

export const signup = async (req: FastifyRequest, res: FastifyReply) => {
  const body = req.body as signupBody;
  const result = await createUser({
    email: body.email,
    password: body.password,
    name: body.name,
  });

  return sendSuccess(
    res,
    buildAuthData(req.server, result.user, result.refreshToken),
    201,
  );
};

export const logout = async (req: FastifyRequest, res: FastifyReply) => {
  await revokeAllSessions(req.user.id);
  return sendSuccess(
    res,
    undefined,
    200,
    "Logged out successfully from all devices",
  );
};

export const refreshToken = async (req: FastifyRequest, res: FastifyReply) => {
  const { refreshToken: token } = req.body as refreshTokenBody;
  const user = await refreshSession(token);
  const accessToken = generateToken(req.server, user, "1h");
  return sendSuccess(res, { token: accessToken });
};

export const changePasswordHandler = async (
  req: FastifyRequest,
  res: FastifyReply,
) => {
  console.log(req.body, "res.body");
  const { oldPassword, newPassword } = req.body as changePasswordBody;
  await changePassword(req.user.id, oldPassword, newPassword);

  return sendSuccess(res, undefined, 200, "Password updated successfully.");
};

export const forgotPasswordHandler = async (
  req: FastifyRequest,
  res: FastifyReply,
) => {
  const { email } = req.body as forgotPasswordBody;
  await requestPasswordReset(email);

  return sendSuccess(
    res,
    undefined,
    200,
    "If an account exists with that email, a reset link has been sent.",
  );
};

export const resetPasswordHandler = async (
  req: FastifyRequest,
  res: FastifyReply,
) => {
  const { token, newPassword } = req.body as resetPasswordBody;
  await resetPasswordWithToken(token, newPassword);

  return sendSuccess(res, undefined, 200, "Password reset successfully.");
};

export const googleLogin = async (req: FastifyRequest, res: FastifyReply) => {
  const { token } = req.body as { token: string };

  if (!token) {
    throw httpError("Google ID token is required.", 400);
  }

  const session = await loginWithGoogle(token);

  return sendSuccess(
    res,
    buildAuthData(req.server, session.user, session.refreshToken),
  );
};

export const triggerGithubLogin = async (
  req: FastifyRequest<{ Querystring: { returnTo?: string } }>,
  res: FastifyReply,
) => {
  const state = createGithubOAuthState();
  const returnTo = req.query.returnTo ?? "/dashboard";
  const redirectUri = `${env.BACKEND_URL}/v1/auth/github/callback`;

  res.setCookie(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state, returnTo } satisfies GithubOAuthStateCookie),
    {
      path: "/",
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      maxAge: 60 * 5,
    },
  );

  return res.redirect(buildGithubAuthorizationUrl(state, redirectUri));
};

export const githubCallback = async (
  req: FastifyRequest<{
    Querystring: { code?: string; state?: string; error?: string };
  }>,
  res: FastifyReply,
) => {
  const { code, state, error } = req.query;
  const loginUrl = `${env.FRONTEND_URL}/login`;

  if (error || !code) {
    return res.redirect(`${loginUrl}?error=access_denied`);
  }

  const cookiePayloadStr = req.cookies[OAUTH_STATE_COOKIE];
  if (!cookiePayloadStr) {
    return res.redirect(`${loginUrl}?error=session_expired`);
  }

  let cookiePayload: GithubOAuthStateCookie;
  try {
    cookiePayload = JSON.parse(cookiePayloadStr) as GithubOAuthStateCookie;
  } catch {
    return res.redirect(`${loginUrl}?error=session_expired`);
  }

  if (state !== cookiePayload.state) {
    req.server.log.warn("CSRF attack detected during GitHub OAuth.");
    return res.redirect(`${loginUrl}?error=csrf_detected`);
  }

  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

  try {
    const session = await loginWithGithub(code);
    const accessToken = generateToken(req.server, session.user, "1h");

    res.setCookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...authCookieOptions,
      maxAge: 60 * 60,
    });

    res.setCookie(REFRESH_TOKEN_COOKIE, session.refreshToken, {
      ...authCookieOptions,
      maxAge: 30 * 24 * 60 * 60,
    });

    return res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    req.server.log.error(err);
    return res.redirect(`${loginUrl}?error=server_error`);
  }
};
