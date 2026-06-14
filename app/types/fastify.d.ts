import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
      name: string;
    };
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}
