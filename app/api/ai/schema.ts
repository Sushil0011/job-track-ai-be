export const questionsSchema = {
  body: {
    type: "object",
    required: ["jobTitle"],
    additionalProperties: false,
    properties: {
      jobTitle: { type: "string", minLength: 2, maxLength: 160 },
      companyName: { type: "string", maxLength: 160 },
      jobDescription: { type: "string", maxLength: 12000 },
      questionType: { type: "string", enum: ["mixed", "technical", "behavioral"] },
      count: { type: "integer", minimum: 3, maximum: 15 },
    },
  },
};

export const resumeAnalysisJsonSchema = {
  body: {
    type: "object",
    required: ["resumeText", "jobDescription"],
    additionalProperties: false,
    properties: {
      resumeText: { type: "string", minLength: 40, maxLength: 40000 },
      jobTitle: { type: "string", maxLength: 160 },
      jobDescription: { type: "string", minLength: 20, maxLength: 14000 },
    },
  },
};

export const followupSchema = {
  body: {
    type: "object",
    required: ["companyName", "position", "purpose"],
    additionalProperties: false,
    properties: {
      companyName: { type: "string", minLength: 1, maxLength: 160 },
      position: { type: "string", minLength: 1, maxLength: 160 },
      contactName: { type: "string", maxLength: 160 },
      purpose: { type: "string", enum: ["follow_up", "thank_you", "salary_negotiation"] },
      tone: { type: "string", enum: ["professional", "warm", "concise"] },
      context: { type: "string", maxLength: 4000 },
    },
  },
};
