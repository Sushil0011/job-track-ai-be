import mongoose from "mongoose";
import { User } from "../../db/schema";
import { httpError } from "../../utils/httpError";

export const getUserInfo = async (userId: string) => {
  if (!mongoose.isValidObjectId(userId)) throw httpError("User not found", 404);
  const user = await User.findById(userId).select("name email");
  if (!user) throw httpError("User not found", 404);
  return { id: String(user._id), name: user.name, email: user.email };
};

export const updateUserInfo = async (
  userId: string,
  payload: { name: string },
) => {
  if (!mongoose.isValidObjectId(userId)) throw httpError("User not found", 404);
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { name: payload.name.trim() } },
    { new: true },
  ).select("name email");
  if (!user) throw httpError("User not found", 404);
  return { id: String(user._id), name: user.name, email: user.email };
};
