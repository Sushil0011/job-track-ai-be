import { users } from "../../db/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { generateRefreshToken, hashToken } from "../../utils/jwt";
import { httpError } from "../../utils/httpError";
import bcrypt from "bcrypt";
import type { SessionResult } from "./type";

type UserRow = typeof users.$inferSelect;

const toAuthUser = (user: UserRow) => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

const saveRefreshToken = async (userId: string) => {
  const { token, expiryDate } = generateRefreshToken();

  await db
    .update(users)
    .set({
      refreshTokenHash: hashToken(token),
      refreshTokenExpiry: expiryDate,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return token;
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
      refreshTokenHash: hashToken(token),
      refreshTokenExpiry: expiryDate,
    })
    .returning();

  if (!newUser) {
    throw httpError("Failed to create user", 500);
  }

  return { user: toAuthUser(newUser), refreshToken: token };
};

export const findUserByEmail = async (payload: {
  email: string;
  password: string;
}) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.email.toLowerCase()));

  const validPassword = await bcrypt.compare(
    payload.password,
    user?.password || "",
  );
  if (!user || !validPassword) {
    throw httpError("Invalid email or password", 401);
  }

  return user;
};

export const loginUser = async (user: UserRow): Promise<SessionResult> => {
  const refreshToken = await saveRefreshToken(user.id);
  return { user: toAuthUser(user), refreshToken };
};

export const refreshSession = async (
  refreshToken: string,
): Promise<{ id: string; email: string; name: string }> => {
  const tokenHash = hashToken(refreshToken);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.refreshTokenHash, tokenHash));

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
  await db
    .update(users)
    .set({
      refreshTokenHash: null,
      refreshTokenExpiry: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
};

export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

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

  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await revokeAllSessions(userId);
};
