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
} from "./service";
import type {
  changePasswordBody,
  forgotPasswordBody,
  loginBody,
  refreshTokenBody,
  resetPasswordBody,
  signupBody,
} from "./type";
import { generateToken } from "../../utils/jwt";
import { sendSuccess } from "../../utils/apiResponse";

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
  console.log(user,'user')
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
