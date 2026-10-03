import type { FastifyInstance } from "fastify";
import { verifyToken } from "../../utils/jwt";
import { createReminder, deleteReminder, listReminders, updateReminder } from "./controller";
import {
  createReminderSchema,
  listRemindersSchema,
  reminderParamsSchema,
  updateReminderSchema,
} from "./schema";

export default async function remindersRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: verifyToken, schema: listRemindersSchema }, listReminders);
  fastify.post("/", { preHandler: verifyToken, schema: createReminderSchema }, createReminder);
  fastify.patch(
    "/:reminderId",
    { preHandler: verifyToken, schema: { ...reminderParamsSchema, ...updateReminderSchema } },
    updateReminder,
  );
  fastify.delete(
    "/:reminderId",
    { preHandler: verifyToken, schema: reminderParamsSchema },
    deleteReminder,
  );
}
