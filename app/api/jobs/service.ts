import mongoose, { type QueryFilter } from "mongoose";
import { Job, Note, Reminder, type JobStatus } from "../../db/schema";
import { httpError } from "../../utils/httpError";

export type { JobStatus };

export type JobInput = {
  companyName?: string;
  position?: string;
  jobUrl?: string | null;
  location?: string | null;
  salaryRange?: string | null;
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  recruiterPhone?: string | null;
  status?: JobStatus;
  applicationDate?: string | null;
};

export type JobListFilters = {
  search?: string;
  status?: JobStatus;
  limit?: number;
  offset?: number;
  sortBy?: "applicationDate" | "createdAt";
  sortOrder?: "asc" | "desc";
};

const cleanOptional = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeJobUrl = (value: string | null | undefined) => {
  const cleaned = cleanOptional(value);
  if (typeof cleaned !== "string") return cleaned;
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
  } catch {
    throw httpError("jobUrl must be a valid http or https URL", 400);
  }
  return cleaned;
};

const normalizeEmail = (value: string | null | undefined) => {
  const cleaned = cleanOptional(value);
  if (typeof cleaned !== "string") return cleaned;
  const at = cleaned.indexOf("@");
  const domain = at >= 0 ? cleaned.slice(at + 1) : "";
  if (
    at <= 0 ||
    at !== cleaned.lastIndexOf("@") ||
    !domain.includes(".") ||
    domain.startsWith(".") ||
    domain.endsWith(".")
  ) {
    throw httpError("recruiterEmail must be a valid email address", 400);
  }
  return cleaned;
};

const parseDate = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw httpError("applicationDate must be a valid date", 400);
  }
  return date;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFilter = (
  userId: string,
  filters: JobListFilters,
): QueryFilter<Record<string, unknown>> => {
  const filter: QueryFilter<Record<string, unknown>> = { userId };
  if (filters.status) filter.status = filters.status;
  const search = filters.search?.trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { companyName: pattern },
      { position: pattern },
      { location: pattern },
    ];
  }
  return filter;
};

export const listJobsForUser = async (
  userId: string,
  filters: JobListFilters = {},
) => {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const filter = buildFilter(userId, filters);
  const sortBy = filters.sortBy ?? "applicationDate";
  const sortOrder = filters.sortOrder ?? "desc";

  const total = await Job.countDocuments(filter);
  const rows = await Job.find(filter)
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .skip(offset)
    .limit(limit);

  return {
    jobs: rows,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + rows.length < total,
    },
  };
};

export const getJobForUser = async (userId: string, jobId: string) => {
  if (!mongoose.isValidObjectId(jobId)) {
    throw httpError("Job application not found", 404);
  }
  const job = await Job.findOne({ _id: jobId, userId });

  if (!job) throw httpError("Job application not found", 404);
  return job;
};

export const createJobForUser = async (userId: string, payload: JobInput) => {
  const companyName = payload.companyName?.trim();
  const position = payload.position?.trim();
  if (!companyName || !position) {
    throw httpError("Company name and position are required", 400);
  }
  const job = await Job.create({
    userId,
    companyName,
    position,
    jobUrl: normalizeJobUrl(payload.jobUrl) ?? null,
    location: cleanOptional(payload.location) ?? null,
    salaryRange: cleanOptional(payload.salaryRange) ?? null,
    recruiterName: cleanOptional(payload.recruiterName) ?? null,
    recruiterEmail: normalizeEmail(payload.recruiterEmail) ?? null,
    recruiterPhone: cleanOptional(payload.recruiterPhone) ?? null,
    status: payload.status ?? "WISHLIST",
    applicationDate: parseDate(payload.applicationDate) ?? new Date(),
  });

  if (!job) throw httpError("Failed to create job application", 500);
  return job;
};

export const updateJobForUser = async (
  userId: string,
  jobId: string,
  payload: JobInput,
) => {
  if (!mongoose.isValidObjectId(jobId)) {
    throw httpError("Job application not found", 404);
  }
  const update: Record<string, unknown> = {};

  if (payload.companyName !== undefined) {
    const companyName = payload.companyName.trim();
    if (!companyName) throw httpError("Company name cannot be empty", 400);
    update.companyName = companyName;
  }
  if (payload.position !== undefined) {
    const position = payload.position.trim();
    if (!position) throw httpError("Position cannot be empty", 400);
    update.position = position;
  }
  if (payload.jobUrl !== undefined) update.jobUrl = normalizeJobUrl(payload.jobUrl) ?? null;
  if (payload.location !== undefined) update.location = cleanOptional(payload.location) ?? null;
  if (payload.salaryRange !== undefined) update.salaryRange = cleanOptional(payload.salaryRange) ?? null;
  if (payload.recruiterName !== undefined) update.recruiterName = cleanOptional(payload.recruiterName) ?? null;
  if (payload.recruiterEmail !== undefined) update.recruiterEmail = normalizeEmail(payload.recruiterEmail) ?? null;
  if (payload.recruiterPhone !== undefined) update.recruiterPhone = cleanOptional(payload.recruiterPhone) ?? null;
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.applicationDate !== undefined) {
    const date = parseDate(payload.applicationDate);
    if (date) update.applicationDate = date;
  }

  const job = await Job.findOneAndUpdate(
    { _id: jobId, userId },
    { $set: update },
    { new: true },
  );

  if (!job) throw httpError("Job application not found", 404);
  return job;
};

export const deleteJobForUser = async (userId: string, jobId: string) => {
  if (!mongoose.isValidObjectId(jobId)) {
    throw httpError("Job application not found", 404);
  }
  const deleted = await Job.findOneAndDelete({ _id: jobId, userId });

  if (!deleted) throw httpError("Job application not found", 404);

  // Mirror the Postgres `ON DELETE CASCADE` for notes and reminders.
  await Promise.all([
    Note.deleteMany({ jobId: deleted._id }),
    Reminder.deleteMany({ jobId: deleted._id }),
  ]);

  return { id: String(deleted._id) };
};
