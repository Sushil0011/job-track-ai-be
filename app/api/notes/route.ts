import type { FastifyInstance } from "fastify";
import { verifyToken } from "../../utils/jwt";
import { createNote, deleteNote, listNotes, updateNote } from "./controller";
import { createNoteSchema, listNotesSchema, noteParamsSchema, updateNoteSchema } from "./schema";

export default async function notesRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: verifyToken, schema: listNotesSchema }, listNotes);
  fastify.post("/", { preHandler: verifyToken, schema: createNoteSchema }, createNote);
  fastify.patch(
    "/:noteId",
    { preHandler: verifyToken, schema: { ...noteParamsSchema, ...updateNoteSchema } },
    updateNote,
  );
  fastify.delete("/:noteId", { preHandler: verifyToken, schema: noteParamsSchema }, deleteNote);
}
