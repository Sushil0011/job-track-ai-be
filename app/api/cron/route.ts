import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../../config/env";
import { httpError } from "../../utils/httpError";
import { sendSuccess } from "../../utils/apiResponse";
import { processDueReminders } from "../reminders/service";

const processReminders = async (req: FastifyRequest, res: FastifyReply) => {
  if (!env.CRON_SECRET) {
    throw httpError("Reminder scheduler is not configured", 503);
  }

  const suppliedHeader = req.headers["x-cron-secret"];
  const supplied = Array.isArray(suppliedHeader) ? suppliedHeader[0] : suppliedHeader;
  const expectedBuffer = Buffer.from(env.CRON_SECRET);
  const suppliedBuffer = Buffer.from(supplied ?? "");
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    throw httpError("Invalid scheduler credentials", 401);
  }

  const result = await processDueReminders();
  return sendSuccess(res, result, 200, "Due reminders processed");
};

export default async function cronRoutes(fastify: FastifyInstance) {
  fastify.post("/reminders", processReminders);
}
