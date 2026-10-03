import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import type { FastifyReply, FastifyRequest } from "fastify";
import { httpError } from "../../utils/httpError";
import { sendSuccess } from "../../utils/apiResponse";
import {
  analyzeResume,
  generateFollowupEmail,
  generateInterviewQuestions,
  type FollowupInput,
  type QuestionInput,
  type ResumeAnalysisInput,
} from "./service";

export const generateQuestions = async (
  req: FastifyRequest,
  res: FastifyReply,
) => {
  const result = await generateInterviewQuestions(req.body as QuestionInput);
  return sendSuccess(res, result);
};

const extractResumeText = async (
  buffer: Buffer,
  filename: string,
  mimeType: string,
) => {
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  let text: string;

  try {
    if (extension === "pdf" || mimeType === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText({ first: 30 });
        text = parsed.text;
      } finally {
        await parser.destroy();
      }
    } else if (
      extension === "docx" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const parsed = await mammoth.extractRawText({ buffer });
      text = parsed.value;
    } else if (
      ["txt", "md"].includes(extension) ||
      mimeType === "text/plain" ||
      mimeType === "text/markdown"
    ) {
      text = buffer.toString("utf8");
    } else {
      throw httpError("Upload a PDF, DOCX, TXT, or Markdown resume", 415);
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }
    throw httpError("Could not extract text from the uploaded resume", 400);
  }

  const cleaned = text.replace(/\u0000/g, "").trim();
  if (cleaned.length < 40) {
    throw httpError("The uploaded resume contains too little readable text", 400);
  }
  if (cleaned.length > 40_000) {
    throw httpError("Resume text is too long to analyze (40,000 characters maximum)", 413);
  }
  return cleaned;
};

const readMultipartResume = async (req: FastifyRequest): Promise<ResumeAnalysisInput> => {
  let resumeText = "";
  let jobTitle = "";
  let jobDescription = "";
  let resumeFileCount = 0;

  for await (const part of req.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "resume") {
        part.file.resume();
        continue;
      }
      resumeFileCount += 1;
      if (resumeFileCount > 1) throw httpError("Upload one resume file at a time", 400);
      const buffer = await part.toBuffer();
      resumeText = await extractResumeText(buffer, part.filename, part.mimetype);
    } else {
      const value = String(part.value ?? "");
      if (part.fieldname === "jobTitle") jobTitle = value;
      if (part.fieldname === "jobDescription") jobDescription = value;
    }
  }

  if (!resumeText) throw httpError("A resume file is required", 400);
  if (jobDescription.trim().length < 20) {
    throw httpError("Add a job description of at least 20 characters", 400);
  }
  return {
    resumeText,
    ...(jobTitle.trim() ? { jobTitle: jobTitle.trim() } : {}),
    jobDescription: jobDescription.trim(),
  };
};

export const analyzeResumeController = async (
  req: FastifyRequest,
  res: FastifyReply,
) => {
  let input: ResumeAnalysisInput;
  if (req.isMultipart()) {
    input = await readMultipartResume(req);
  } else {
    const body = req.body as ResumeAnalysisInput | undefined;
    if (!body || typeof body.resumeText !== "string" || typeof body.jobDescription !== "string") {
      throw httpError("Provide resumeText and jobDescription, or upload a resume file", 400);
    }
    input = body;
    if (input.resumeText.length > 40_000) {
      throw httpError("Resume text is too long to analyze (40,000 characters maximum)", 413);
    }
  }

  const result = await analyzeResume(input);
  return sendSuccess(res, result);
};

export const generateFollowup = async (
  req: FastifyRequest,
  res: FastifyReply,
) => {
  const result = await generateFollowupEmail(req.body as FollowupInput);
  return sendSuccess(res, result);
};
