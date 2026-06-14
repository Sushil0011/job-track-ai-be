import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";

export const  updateUserInfo= async (userId:string, payload:any)=>{
await db.update(users).set({name:payload.name}).where(eq(users.id,userId))
}