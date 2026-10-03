import type { FastifyInstance } from "fastify";
import { verifyToken } from "../../utils/jwt";
import { createJob, deleteJob, getJob, listJobs, updateJob } from "./controller";
import { createJobSchema, jobParamsSchema, listJobsSchema, updateJobSchema } from "./schema";

export default async function jobsRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: verifyToken, schema: listJobsSchema }, listJobs);
  fastify.post("/", { preHandler: verifyToken, schema: createJobSchema }, createJob);
  fastify.get("/:jobId", { preHandler: verifyToken, schema: jobParamsSchema }, getJob);
  fastify.patch(
    "/:jobId",
    { preHandler: verifyToken, schema: { ...jobParamsSchema, ...updateJobSchema } },
    updateJob,
  );
  fastify.delete("/:jobId", { preHandler: verifyToken, schema: jobParamsSchema }, deleteJob);
}
