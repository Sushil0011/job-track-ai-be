import { JOB_STATUSES } from "../../db/schema";

const optionalString = { type: "string", maxLength: 500 } as const;

const jobProperties = {
  companyName: { type: "string", minLength: 1, maxLength: 160 },
  position: { type: "string", minLength: 1, maxLength: 160 },
  jobUrl: optionalString,
  location: optionalString,
  salaryRange: optionalString,
  recruiterName: optionalString,
  recruiterEmail: { type: "string", maxLength: 320 },
  recruiterPhone: optionalString,
  status: { type: "string", enum: [...JOB_STATUSES] },
  applicationDate: { type: "string", minLength: 1, maxLength: 40 },
} as const;

export const createJobSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["companyName", "position"],
    properties: jobProperties,
  },
};

export const updateJobSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: jobProperties,
  },
};

export const listJobsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", maxLength: 160 },
      status: { type: "string", enum: [...JOB_STATUSES] },
      limit: { type: "string", pattern: "^\\d{1,3}$" },
      offset: { type: "string", pattern: "^\\d{1,8}$" },
      sortBy: { type: "string", enum: ["applicationDate", "createdAt"] },
      sortOrder: { type: "string", enum: ["asc", "desc"] },
    },
  },
};

export const jobParamsSchema = {
  params: {
    type: "object",
    required: ["jobId"],
    properties: { jobId: { type: "string", minLength: 1, maxLength: 100 } },
  },
};
