import type { FastifyRequest, FastifyReply } from "fastify";
import {
  createUser,
  findUserByEmail,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  rotateRefreshToken,
} from "./service";
import type {
  AuthUser,
  forgotPasswordBody,
  loginBody,
  refreshTokenBody,
  resetPasswordBody,
  signupBody,
} from "./type";
import { generateToken } from "../../utils/jwt";

const buildAuthResponse = (
  fastify: FastifyRequest["server"],
  user: AuthUser,
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
    refreshToken: user.refreshToken,
  };
};

export const login = async (req: FastifyRequest, res: FastifyReply) => {
  const user = await findUserByEmail(req.body as loginBody);
  const refreshedUser = await rotateRefreshToken(user.id);

  res.send({
    status: "success",
    data: buildAuthResponse(req.server, refreshedUser),
  });
};

export const signup = async (req: FastifyRequest, res: FastifyReply) => {
  const user = await createUser(req.body as signupBody);

  res.send({
    status: "success",
    data: buildAuthResponse(req.server, user),
  });
};

export const refreshToken = async (req: FastifyRequest, res: FastifyReply) => {
  const { refreshToken: token } = req.body as refreshTokenBody;
  const user = await refreshAccessToken(token);

  res.send({
    status: "success",
    data: buildAuthResponse(req.server, user),
  });
};

export const forgotPassword = async (
  req: FastifyRequest,
  res: FastifyReply,
) => {
  const { email } = req.body as forgotPasswordBody;
  const resetToken = await requestPasswordReset(email);

  if (resetToken) {
    req.log.info(
      { email, resetToken },
      "Password reset token generated (dev only — replace with email delivery)",
    );
  }

  res.send({
    status: "success",
    message:
      "If an account with that email exists, a password reset link has been sent.",
  });
};

export const resetPasswordHandler = async (
  req: FastifyRequest,
  res: FastifyReply,
) => {
  const { token, password } = req.body as resetPasswordBody;
  await resetPassword(token, password);

  res.send({
    status: "success",
    message: "Password has been reset successfully.",
  });
};
