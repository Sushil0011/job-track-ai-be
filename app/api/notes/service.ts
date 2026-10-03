import mongoose from "mongoose";
import { Job, Note } from "../../db/schema";
import { httpError } from "../../utils/httpError";
import { getJobForUser } from "../jobs/service";

export const listNotesForJob = async (userId: string, jobId: string) => {
  await getJobForUser(userId, jobId);
  return Note.find({ jobId }).sort({ createdAt: -1 });
};

export const createNoteForJob = async (
  userId: string,
  jobId: string,
  content: string,
) => {
  await getJobForUser(userId, jobId);
  const trimmedContent = content.trim();
  if (!trimmedContent) throw httpError("Note content cannot be empty", 400);
  const note = await Note.create({ jobId, content: trimmedContent });
  return note;
};

const assertNoteOwnership = async (userId: string, noteId: string) => {
  if (!mongoose.isValidObjectId(noteId)) throw httpError("Note not found", 404);
  const note = await Note.findOne({ _id: noteId });
  if (!note) throw httpError("Note not found", 404);
  const ownedJob = await Job.exists({ _id: note.jobId, userId });
  if (!ownedJob) throw httpError("Note not found", 404);
  return note;
};

export const updateNoteForUser = async (
  userId: string,
  noteId: string,
  content: string,
) => {
  const note = await assertNoteOwnership(userId, noteId);
  const trimmedContent = content.trim();
  if (!trimmedContent) throw httpError("Note content cannot be empty", 400);
  const updated = await Note.findOneAndUpdate(
    { _id: note._id },
    { $set: { content: trimmedContent } },
    { new: true },
  );
  if (!updated) throw httpError("Note not found", 404);
  return updated;
};

export const deleteNoteForUser = async (userId: string, noteId: string) => {
  const note = await assertNoteOwnership(userId, noteId);
  await Note.deleteOne({ _id: note._id });
  return { id: String(note._id) };
};
