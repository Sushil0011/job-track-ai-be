import mongoose from "mongoose";
import { Job, Reminder } from "../../db/schema";
import { httpError } from "../../utils/httpError";
import { sendReminderEmail } from "../../services/email";
import { getJobForUser } from "../jobs/service";

const parseReminderDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw httpError("reminderDate must be a valid date", 400);
  }
  return date;
};

const assertReminderOwnership = async (userId: string, reminderId: string) => {
  if (!mongoose.isValidObjectId(reminderId)) {
    throw httpError("Reminder not found", 404);
  }
  const reminder = await Reminder.findOne({ _id: reminderId });
  if (!reminder) throw httpError("Reminder not found", 404);
  const ownedJob = await Job.exists({ _id: reminder.jobId, userId });
  if (!ownedJob) throw httpError("Reminder not found", 404);
  return reminder;
};

export const listRemindersForUser = async (
  userId: string,
  options: { jobId?: string; upcoming?: boolean; limit?: number } = {},
) => {
  if (options.jobId && !mongoose.isValidObjectId(options.jobId)) return [];

  const ownedJobs = await Job.find({ userId }).select("companyName position");
  const jobById = new Map(
    ownedJobs.map((job) => [String(job._id), job] as const),
  );

  const conditions: Record<string, unknown>[] = [
    { jobId: { $in: ownedJobs.map((job) => job._id) } },
  ];
  if (options.jobId) conditions.push({ jobId: options.jobId });
  if (options.upcoming) {
    conditions.push({ completed: false });
    conditions.push({ reminderDate: { $gte: new Date() } });
  }

  const rows = await Reminder.find({ $and: conditions })
    .sort({ reminderDate: 1 })
    .limit(Math.min(Math.max(options.limit ?? 100, 1), 200));

  return rows.map((reminder) => {
    const job = jobById.get(String(reminder.jobId));
    return {
      id: String(reminder._id),
      jobId: String(reminder.jobId),
      title: reminder.title,
      reminderDate: reminder.reminderDate,
      completed: reminder.completed,
      notificationSentAt: reminder.notificationSentAt ?? null,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
      companyName: job?.companyName ?? null,
      position: job?.position ?? null,
    };
  });
};

export const createReminderForJob = async (
  userId: string,
  input: { jobId: string; title: string; reminderDate: string },
) => {
  await getJobForUser(userId, input.jobId);
  const title = input.title.trim();
  if (!title) throw httpError("Reminder title cannot be empty", 400);
  const reminder = await Reminder.create({
    jobId: input.jobId,
    title,
    reminderDate: parseReminderDate(input.reminderDate),
  });
  return reminder;
};

export const updateReminderForUser = async (
  userId: string,
  reminderId: string,
  input: { title?: string; reminderDate?: string; completed?: boolean },
) => {
  await assertReminderOwnership(userId, reminderId);
  const update: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw httpError("Reminder title cannot be empty", 400);
    update.title = title;
  }
  if (input.reminderDate !== undefined) {
    update.reminderDate = parseReminderDate(input.reminderDate);
    update.notificationSentAt = null;
  }
  if (input.completed !== undefined) {
    update.completed = input.completed;
    if (!input.completed) update.notificationSentAt = null;
  }

  const reminder = await Reminder.findOneAndUpdate(
    { _id: reminderId },
    { $set: update },
    { new: true },
  );
  if (!reminder) throw httpError("Reminder not found", 404);
  return reminder;
};

export const deleteReminderForUser = async (userId: string, reminderId: string) => {
  const reminder = await assertReminderOwnership(userId, reminderId);
  await Reminder.deleteOne({ _id: reminder._id });
  return { id: String(reminder._id) };
};

export const processDueReminders = async () => {
  const now = new Date();
  const due = await Reminder.find({
    reminderDate: { $lte: now },
    completed: false,
    notificationSentAt: null,
  })
    .sort({ reminderDate: 1 })
    .limit(100);

  let sent = 0;
  let failed = 0;
  for (const reminder of due) {
    const job = await Job.findOne({ _id: reminder.jobId }).populate<{
      userId: { email: string; name: string } | null;
    }>("userId", "email name");

    if (!job?.userId) continue;

    const claimed = await Reminder.findOneAndUpdate(
      { _id: reminder._id, completed: false, notificationSentAt: null },
      { $set: { notificationSentAt: new Date() } },
    );
    if (!claimed) continue;

    try {
      await sendReminderEmail({
        to: job.userId.email,
        name: job.userId.name,
        reminderTitle: reminder.title,
        companyName: job.companyName,
        position: job.position,
        reminderDate: reminder.reminderDate,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      await Reminder.updateOne(
        { _id: reminder._id },
        { $set: { notificationSentAt: null } },
      );
      console.error("[reminders] Failed to send reminder email", error);
    }
  }

  return { checked: due.length, sent, failed };
};
