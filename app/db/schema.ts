import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Model } from "mongoose";

// --- SCHEMAS ---
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    authProvider: {
      type: String,
      enum: ["EMAIL", "GOOGLE", "GITHUB"],
      default: "EMAIL",
      required: true,
    },
    password: { type: String },
    refreshTokenHash: { type: String },
    refreshTokenExpiry: { type: Date },
    passwordResetTokenHash: { type: String },
    passwordResetTokenExpiry: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userSchema.index({ refreshTokenHash: 1 });
userSchema.index({ passwordResetTokenHash: 1 });

const jobSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyName: { type: String, required: true },
    position: { type: String, required: true },
    jobUrl: { type: String },
    location: { type: String },
    salaryRange: { type: String },
    status: {
      type: String,
      enum: ["WISHLIST", "APPLIED", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED"],
      default: "WISHLIST",
      required: true,
    },
    applicationDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const noteSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const reminderSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    reminderDate: { type: Date, required: true },
    completed: { type: Boolean, default: false, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// --- TYPES ---
export type UserRecord = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type JobRecord = InferSchemaType<typeof jobSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type NoteRecord = InferSchemaType<typeof noteSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type ReminderRecord = InferSchemaType<typeof reminderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type UserDoc = HydratedDocument<UserRecord>;
export type JobDoc = HydratedDocument<JobRecord>;
export type NoteDoc = HydratedDocument<NoteRecord>;
export type ReminderDoc = HydratedDocument<ReminderRecord>;

// --- MODELS (guarded so watch mode / tests can re-import safely) ---
export const User =
  (mongoose.models.User as Model<UserRecord>) ??
  mongoose.model<UserRecord>("User", userSchema);

export const Job =
  (mongoose.models.Job as Model<JobRecord>) ??
  mongoose.model<JobRecord>("Job", jobSchema);

export const Note =
  (mongoose.models.Note as Model<NoteRecord>) ??
  mongoose.model<NoteRecord>("Note", noteSchema);

export const Reminder =
  (mongoose.models.Reminder as Model<ReminderRecord>) ??
  mongoose.model<ReminderRecord>("Reminder", reminderSchema);
