import type { FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess } from "../../utils/apiResponse";
import {
  createReminderForJob,
  deleteReminderForUser,
  listRemindersForUser,
  updateReminderForUser,
} from "./service";

export const listReminders = async (req: FastifyRequest, res: FastifyReply) => {
  const query = req.query as { jobId?: string; upcoming?: string; limit?: string };
  const reminders = await listRemindersForUser(req.user.id, {
    ...(query.jobId ? { jobId: query.jobId } : {}),
    ...(query.upcoming === undefined ? {} : { upcoming: query.upcoming === "true" }),
    ...(query.limit ? { limit: Number(query.limit) } : {}),
  });
  return sendSuccess(res, { reminders });
};

export const createReminder = async (req: FastifyRequest, res: FastifyReply) => {
  const body = req.body as { jobId: string; title: string; reminderDate: string };
  const reminder = await createReminderForJob(req.user.id, body);
  return sendSuccess(res, { reminder }, 201, "Reminder created");
};

export const updateReminder = async (req: FastifyRequest, res: FastifyReply) => {
  const { reminderId } = req.params as { reminderId: string };
  const body = req.body as { title?: string; reminderDate?: string; completed?: boolean };
  const reminder = await updateReminderForUser(req.user.id, reminderId, body);
  return sendSuccess(res, { reminder }, 200, "Reminder updated");
};

export const deleteReminder = async (req: FastifyRequest, res: FastifyReply) => {
  const { reminderId } = req.params as { reminderId: string };
  const deleted = await deleteReminderForUser(req.user.id, reminderId);
  return sendSuccess(res, deleted, 200, "Reminder deleted");
};
