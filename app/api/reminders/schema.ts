export const listRemindersSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      jobId: { type: "string", minLength: 1, maxLength: 100 },
      upcoming: { type: "string", enum: ["true", "false"] },
      limit: { type: "string", pattern: "^\\d{1,3}$" },
    },
  },
};

export const createReminderSchema = {
  body: {
    type: "object",
    required: ["jobId", "title", "reminderDate"],
    additionalProperties: false,
    properties: {
      jobId: { type: "string", minLength: 1, maxLength: 100 },
      title: { type: "string", minLength: 1, maxLength: 200 },
      reminderDate: { type: "string", minLength: 1, maxLength: 40 },
    },
  },
};

export const updateReminderSchema = {
  body: {
    type: "object",
    minProperties: 1,
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      reminderDate: { type: "string", minLength: 1, maxLength: 40 },
      completed: { type: "boolean" },
    },
  },
};

export const reminderParamsSchema = {
  params: {
    type: "object",
    required: ["reminderId"],
    properties: { reminderId: { type: "string", minLength: 1, maxLength: 100 } },
  },
};
