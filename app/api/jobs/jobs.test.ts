import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  listJobsForUser: vi.fn(),
  getJobForUser: vi.fn(),
  createJobForUser: vi.fn(),
  updateJobForUser: vi.fn(),
  deleteJobForUser: vi.fn(),
}));

vi.mock("./service", () => service);

import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app";

const sampleJob = {
  id: "job-123",
  userId: "user-123",
  companyName: "Acme",
  position: "Frontend Engineer",
  jobUrl: null,
  location: null,
  salaryRange: null,
  recruiterName: null,
  recruiterEmail: null,
  recruiterPhone: null,
  status: "WISHLIST",
  applicationDate: new Date("2026-10-01T00:00:00.000Z"),
};

describe("Job application API routes", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    token = app.jwt.sign({ id: "user-123", email: "user@example.com", name: "Test User" });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/jobs" });
    expect(response.statusCode).toBe(401);
    expect(service.listJobsForUser).not.toHaveBeenCalled();
  });

  it("lists only the authenticated user's filtered jobs", async () => {
    service.listJobsForUser.mockResolvedValue({
      jobs: [sampleJob],
      pagination: { limit: 10, offset: 0, total: 1, hasMore: false },
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/jobs?search=Acme&status=WISHLIST&limit=10",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.jobs).toHaveLength(1);
    expect(service.listJobsForUser).toHaveBeenCalledWith("user-123", expect.objectContaining({
      search: "Acme",
      status: "WISHLIST",
      limit: 10,
    }));
  });

  it("creates an application for the authenticated user", async () => {
    service.createJobForUser.mockResolvedValue(sampleJob);
    const response = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { authorization: `Bearer ${token}` },
      payload: { companyName: "Acme", position: "Frontend Engineer", status: "WISHLIST" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.job.id).toBe("job-123");
    expect(service.createJobForUser).toHaveBeenCalledWith("user-123", expect.objectContaining({ companyName: "Acme" }));
  });

  it("rejects an invalid status before calling the service", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { authorization: `Bearer ${token}` },
      payload: { companyName: "Acme", position: "Engineer", status: "IN_PROGRESS" },
    });

    expect(response.statusCode).toBe(400);
    expect(service.createJobForUser).not.toHaveBeenCalled();
  });
});
