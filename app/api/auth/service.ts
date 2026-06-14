import { users } from "./../../db/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import {
  generateRefreshToken,
  generateResetToken,
  hashToken,
} from "../../utils/jwt";
import bcrypt from "bcrypt";
import type { FastifyError } from "fastify";

const httpError = (message: string, statusCode: number): FastifyError => {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  return error;
};

const publicUserFields = {
  id: users.id,
  email: users.email,
  name: users.name,
  refreshToken: users.refreshToken,
  refreshTokenExpiry: users.refreshTokenExpiry,
};

export const createUser = async (payload: {
  email: string;
  password: string;
  name: string;
}) => {
  const { token, expiryDate } = generateRefreshToken();
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      email: payload.email.toLowerCase(),
      name: payload.name,
      password: hashedPassword,
      refreshToken: token,
      refreshTokenExpiry: expiryDate,
    })
    .returning(publicUserFields);

  if (!newUser) {
    throw httpError("Failed to create user", 500);
  }

  return newUser;
};

export const findUserByEmail = async (payload: {
  email: string;
  password: string;
}) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.email.toLowerCase()))
    .execute();

  const validPassword = await bcrypt.compare(
    payload.password,
    user?.password || "",
  );
  if (!user || !validPassword) {
    throw httpError("Invalid email or password", 401);
  }

  return user;
};

export const rotateRefreshToken = async (userId: string) => {
  const { token, expiryDate } = generateRefreshToken();

  const [updatedUser] = await db
    .update(users)
    .set({
      refreshToken: token,
      refreshTokenExpiry: expiryDate,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning(publicUserFields);

  if (!updatedUser) {
    throw httpError("User not found", 404);
  }

  return updatedUser;
};

export const refreshAccessToken = async (refreshToken: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.refreshToken, refreshToken));

  if (!user || new Date() > user.refreshTokenExpiry) {
    throw httpError("Invalid or expired refresh token", 401);
  }

  return rotateRefreshToken(user.id);
};

export const requestPasswordReset = async (email: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));

  if (!user) {
    return null;
  }

  const { token, expiryDate } = generateResetToken();

  await db
    .update(users)
    .set({
      passwordResetToken: hashToken(token),
      passwordResetExpiry: expiryDate,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return token;
};

export const resetPassword = async (token: string, password: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.passwordResetToken, hashToken(token)));

  if (
    !user ||
    !user.passwordResetExpiry ||
    new Date() > user.passwordResetExpiry
  ) {
    throw httpError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const { token: refreshToken, expiryDate } = generateRefreshToken();

  await db
    .update(users)
    .set({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
      refreshToken,
      refreshTokenExpiry: expiryDate,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
};
