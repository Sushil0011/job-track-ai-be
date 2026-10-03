import type { FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess } from "../../utils/apiResponse";
import {
  createNoteForJob,
  deleteNoteForUser,
  listNotesForJob,
  updateNoteForUser,
} from "./service";

export const listNotes = async (req: FastifyRequest, res: FastifyReply) => {
  const { jobId } = req.query as { jobId: string };
  const notes = await listNotesForJob(req.user.id, jobId);
  return sendSuccess(res, { notes });
};

export const createNote = async (req: FastifyRequest, res: FastifyReply) => {
  const body = req.body as { jobId: string; content: string };
  const note = await createNoteForJob(req.user.id, body.jobId, body.content);
  return sendSuccess(res, { note }, 201, "Note created");
};

export const updateNote = async (req: FastifyRequest, res: FastifyReply) => {
  const { noteId } = req.params as { noteId: string };
  const body = req.body as { content: string };
  const note = await updateNoteForUser(req.user.id, noteId, body.content);
  return sendSuccess(res, { note }, 200, "Note updated");
};

export const deleteNote = async (req: FastifyRequest, res: FastifyReply) => {
  const { noteId } = req.params as { noteId: string };
  const deleted = await deleteNoteForUser(req.user.id, noteId);
  return sendSuccess(res, deleted, 200, "Note deleted");
};
