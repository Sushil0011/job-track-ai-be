import type { FastifyRequest, FastifyReply } from "fastify";
import { updateUserInfo } from "./service";


type User={
    name:string
    email:string
    id:string
}

export const updateUser = async (req: FastifyRequest, res: FastifyReply) => {
    const userId= (req.user as User).id
    console.log(req.user)
    const updatedUser = await updateUserInfo(userId, req.body);
    res.send({message:"user updated"})
};