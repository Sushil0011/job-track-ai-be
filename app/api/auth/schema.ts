export const signupSchema = {
  body: {
    type: "object",
    required: ["email", "password", "name"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
      name: { type: "string", minLength: 2 },
    },
  },
};

export const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
    },
  },
};

export const refreshTokenSchema = {
  body: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string", minLength: 1 },
    },
  },
};

export const changePasswordSchema = {
  body: {
    type: "object",
    required: ["oldPassword", "newPassword"],
    properties: {
      oldPassword: { type: "string", minLength: 6 },
      newPassword: { type: "string", minLength: 6 },
    },
  },
};
