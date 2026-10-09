import { User } from "../../db/schema";

export const  updateUserInfo= async (userId:string, payload:any)=>{
await User.updateOne({_id:userId},{$set:{name:payload.name}})
}