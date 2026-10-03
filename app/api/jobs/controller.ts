import type { FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess } from "../../utils/apiResponse";
import type { JobInput, JobListFilters, JobStatus } from "./service";
import {
  createJobForUser,
  deleteJobForUser,
  getJobForUser,
  listJobsForUser,
  updateJobForUser,
} from "./service";

export const listJobs = async (req: FastifyRequest, res: FastifyReply) => {
  const query = req.query as Record<string, string | undefined>;
  const filters: JobListFilters = {
    ...(query.search ? { search: query.search } : {}),
    ...(query.status ? { status: query.status as JobStatus } : {}),
    ...(query.limit ? { limit: Number(query.limit) } : {}),
    ...(query.offset ? { offset: Number(query.offset) } : {}),
    sortBy: query.sortBy === "createdAt" ? "createdAt" : "applicationDate",
    sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
  };
  const result = await listJobsForUser(req.user.id, filters);
  return sendSuccess(res, result);
};

export const getJob = async (req: FastifyRequest, res: FastifyReply) => {
  const { jobId } = req.params as { jobId: string };
  const job = await getJobForUser(req.user.id, jobId);
  return sendSuccess(res, { job });
};

export const createJob = async (req: FastifyRequest, res: FastifyReply) => {
  const job = await createJobForUser(req.user.id, req.body as JobInput);
  return sendSuccess(res, { job }, 201, "Job application created");
};

export const updateJob = async (req: FastifyRequest, res: FastifyReply) => {
  const { jobId } = req.params as { jobId: string };
  const job = await updateJobForUser(req.user.id, jobId, req.body as JobInput);
  return sendSuccess(res, { job }, 200, "Job application updated");
};

export const deleteJob = async (req: FastifyRequest, res: FastifyReply) => {
  const { jobId } = req.params as { jobId: string };
  const deleted = await deleteJobForUser(req.user.id, jobId);
  return sendSuccess(res, deleted, 200, "Job application deleted");
};
