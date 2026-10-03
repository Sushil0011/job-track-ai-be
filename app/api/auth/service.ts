import {
  User,
  GithubLoginExchangeCode,
  type UserDoc,
} from "../../db/schema";
import {
  generateRefreshToken,
  generateResetToken,
  hashToken,
} from "../../utils/jwt";
import { httpError } from "../../utils/httpError";
import { env } from "../../config/env";
import { sendPasswordResetEmail } from "../../services/email";
import bcrypt from "bcrypt";
import crypto from "crypto";
import type { SessionResult } from "./type";
import { OAuth2Client } from "google-auth-library";

type UserRow = UserDoc;

const toAuthUser = (user: UserRow) => ({
  id: String(user._id),
  email: user.email,
  name: user.name,
});

const saveRefreshToken = async (userId: string) => {
  const { token, expiryDate } = generateRefreshToken();

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        refreshTokenHash: hashToken(token),
        refreshTokenExpiry: expiryDate,
      },
    },
  );

  return token;
};

export const createUser = async (payload: {
  email: string;
  password: string;
  name: string;
}) => {
  const { token, expiryDate } = generateRefreshToken();
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const newUser = await User.create({
    email: payload.email.toLowerCase(),
    name: payload.name,
    authProvider: "EMAIL",
    password: hashedPassword,
    refreshTokenHash: hashToken(token),
    refreshTokenExpiry: expiryDate,
  });

  if (!newUser) {
    throw httpError("Failed to create user", 500);
  }

  return { user: toAuthUser(newUser), refreshToken: token };
};

export const findUserByEmail = async (payload: {
  email: string;
  password: string;
}) => {
  const user = await User.findOne({ email: payload.email.toLowerCase() });

  if (!user) {
    throw httpError("User not found. Please sign up.", 404);
  }

  const validPassword = await bcrypt.compare(
    payload.password,
    user.password || "",
  );
  if (!validPassword) {
    throw httpError("Invalid email or password", 401);
  }

  return user;
};

export const loginUser = async (user: UserRow): Promise<SessionResult> => {
  const refreshToken = await saveRefreshToken(String(user._id));
  return { user: toAuthUser(user), refreshToken };
};

export const refreshSession = async (
  refreshToken: string,
): Promise<{ id: string; email: string; name: string }> => {
  const tokenHash = hashToken(refreshToken);

  const user = await User.findOne({ refreshTokenHash: tokenHash });

  if (
    !user ||
    !user.refreshTokenExpiry ||
    new Date() > user.refreshTokenExpiry
  ) {
    throw httpError(
      "Session expired. Please log in again.",
      401,
    );
  }

  return toAuthUser(user);
};

export const revokeAllSessions = async (userId: string) => {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        refreshTokenHash: null,
        refreshTokenExpiry: null,
      },
    },
  );
};

export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
) => {
  const user = await User.findById(userId);

  if (!user?.password) {
    throw httpError("User not found", 404);
  }

  if (oldPassword === newPassword) {
    throw httpError(
      "New password must be different from current password",
      400,
    );
  }

  const validPassword = await bcrypt.compare(oldPassword, user.password);
  if (!validPassword) {
    throw httpError("Invalid current password", 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await User.updateOne(
    { _id: user._id },
    { $set: { password: hashedPassword } },
  );

  await revokeAllSessions(userId);
};

export const requestPasswordReset = async (email: string) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return;
  }

  const { token, expiryDate } = generateResetToken();

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetTokenHash: hashToken(token),
        passwordResetTokenExpiry: expiryDate,
      },
    },
  );

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail({ to: user.email, resetUrl });
};

export const resetPasswordWithToken = async (
  token: string,
  newPassword: string,
) => {
  const tokenHash = hashToken(token);

  const user = await User.findOne({ passwordResetTokenHash: tokenHash });

  if (
    !user ||
    !user.passwordResetTokenExpiry ||
    new Date() > user.passwordResetTokenExpiry
  ) {
    throw httpError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetTokenExpiry: null,
        refreshTokenHash: null,
        refreshTokenExpiry: null,
      },
    },
  );
};


export const loginWithGoogle = async (
  token: string,
): Promise<SessionResult> => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw httpError("Google login is not configured", 503);
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw httpError(
      "Authentication failed. Token may be invalid or expired.",
      401,
    );
  }

  if (!payload?.email) {
    throw httpError("Invalid token payload from Google.", 400);
  }

  const email = payload.email.toLowerCase();
  const name = payload.name ?? "Google User";

  const existingUser = await User.findOne({ email });

  let user: UserRow;
  if (existingUser) {
    user = existingUser;
  } else {
    const newUser = await User.create({
      email,
      name,
      authProvider: "GOOGLE",
    });

    if (!newUser) {
      throw httpError("Failed to create user", 500);
    }
    user = newUser;
  }

  return loginUser(user);
};

export const createGithubOAuthState = () =>
  crypto.randomBytes(16).toString("hex");

export const buildGithubAuthorizationUrl = (
  state: string,
  redirectUri: string,
) => {
  if (!env.GITHUB_CLIENT_ID) {
    throw httpError("GitHub login is not configured", 503);
  }

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "user:email",
    state,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

type GithubUser = {
  id: number;
  login: string;
  name: string | null;
};

export const loginWithGithub = async (
  code: string,
): Promise<SessionResult> => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw httpError("GitHub login is not configured", 503);
  }

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    },
  );

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw httpError("Invalid GitHub authorization code", 401);
  }

  const authHeader = { Authorization: `Bearer ${tokenData.access_token}` };

  const userResponse = await fetch("https://api.github.com/user", {
    headers: authHeader,
  });
  if (!userResponse.ok) {
    throw httpError("Failed to fetch GitHub user profile", 502);
  }

  const githubUser = (await userResponse.json()) as GithubUser;

  const emailResponse = await fetch("https://api.github.com/user/emails", {
    headers: authHeader,
  });
  if (!emailResponse.ok) {
    throw httpError("Failed to fetch GitHub user emails", 502);
  }

  const emails = (await emailResponse.json()) as GithubEmail[];
  const primaryEmail = emails.find((entry) => entry.primary && entry.verified);

  if (!primaryEmail?.email) {
    throw httpError("No verified primary email found on GitHub account", 400);
  }

  const email = primaryEmail.email.toLowerCase();
  const name = githubUser.name ?? githubUser.login;

  const existingUser = await User.findOne({ email });

  let user: UserRow;
  if (existingUser) {
    user = existingUser;
  } else {
    const newUser = await User.create({
      email,
      name,
      authProvider: "GITHUB",
    });

    if (!newUser) {
      throw httpError("Failed to create user", 500);
    }
    user = newUser;
  }

  return loginUser(user);
};
export const createGithubLoginExchangeCode = async (userId: string) => {
  const now = new Date();
  await GithubLoginExchangeCode.deleteMany({ expiresAt: { $lte: now } });

  const code = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  await GithubLoginExchangeCode.create({
    codeHash: hashToken(code),
    userId,
    expiresAt,
  });

  return code;
};

export const redeemGithubLoginExchangeCode = async (
  code: string,
): Promise<SessionResult> => {
  const exchange = await GithubLoginExchangeCode.findOneAndDelete({
    codeHash: hashToken(code),
    expiresAt: { $gt: new Date() },
  });

  if (!exchange) {
    throw httpError("GitHub login session is invalid or expired", 401);
  }

  const user = await User.findById(exchange.userId);

  if (!user) {
    throw httpError("GitHub login session is invalid or expired", 401);
  }

  return loginUser(user);
};
