import { Job, type JobStatus } from "../../db/schema";

const monthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const getAnalyticsForUser = async (userId: string) => {
  const userJobs = await Job.find({ userId }).lean();
  const total = userJobs.length;
  const offers = userJobs.filter((job) => job.status === "OFFER").length;
  const rejections = userJobs.filter((job) => job.status === "REJECTED").length;
  const interviews = userJobs.filter((job) => job.status === "INTERVIEW").length;
  const active = userJobs.filter(
    (job) => job.status !== "OFFER" && job.status !== "REJECTED",
  ).length;

  const statusBreakdown: Record<JobStatus, number> = {
    WISHLIST: 0,
    APPLIED: 0,
    ASSESSMENT: 0,
    INTERVIEW: 0,
    OFFER: 0,
    REJECTED: 0,
  };
  for (const job of userJobs) statusBreakdown[job.status as JobStatus] += 1;

  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      month: monthKey(date),
      applications: 0,
      interviews: 0,
      offers: 0,
    };
  });
  const byMonth = new Map(trend.map((entry) => [entry.month, entry]));

  for (const job of userJobs) {
    const date = job.applicationDate ?? job.createdAt;
    if (!date) continue;
    const bucket = byMonth.get(monthKey(date));
    if (!bucket) continue;
    bucket.applications += 1;
    if (job.status === "INTERVIEW" || job.status === "OFFER") bucket.interviews += 1;
    if (job.status === "OFFER") bucket.offers += 1;
  }

  return {
    summary: {
      totalApplications: total,
      activeApplications: active,
      interviews,
      offers,
      rejections,
      interviewRate: total ? Math.round(((interviews + offers) / total) * 100) : 0,
      offerRate: total ? Math.round((offers / total) * 100) : 0,
    },
    statusBreakdown,
    trend,
  };
};
