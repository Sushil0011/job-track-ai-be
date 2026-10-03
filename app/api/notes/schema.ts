export const listNotesSchema = {
  querystring: {
    type: "object",
    required: ["jobId"],
    additionalProperties: false,
    properties: { jobId: { type: "string", minLength: 1, maxLength: 100 } },
  },
};

export const createNoteSchema = {
  body: {
    type: "object",
    required: ["jobId", "content"],
    additionalProperties: false,
    properties: {
      jobId: { type: "string", minLength: 1, maxLength: 100 },
      content: { type: "string", minLength: 1, maxLength: 5000 },
    },
  },
};

export const updateNoteSchema = {
  body: {
    type: "object",
    required: ["content"],
    additionalProperties: false,
    properties: { content: { type: "string", minLength: 1, maxLength: 5000 } },
  },
};

export const noteParamsSchema = {
  params: {
    type: "object",
    required: ["noteId"],
    properties: { noteId: { type: "string", minLength: 1, maxLength: 100 } },
  },
};
