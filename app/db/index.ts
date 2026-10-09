import mongoose from "mongoose";
import { env } from "../config/env";
import { User, Job, Note, Reminder } from "./schema";

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  await mongoose.connect(env.MONGODB_URI);

  // Ensure unique indexes (e.g. user.email) exist before serving traffic
  await Promise.all([User.init(), Job.init(), Note.init(), Reminder.init()]);

  return mongoose.connection;
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
