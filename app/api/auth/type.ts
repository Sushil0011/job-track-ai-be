export type signupBody = {
  email: string;
  password: string;
  name: string;
};

export type loginBody = {
  email: string;
  password: string;
};

export type refreshTokenBody = {
  refreshToken: string;
};

export type changePasswordBody = {
  oldPassword: string;
  newPassword: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  refreshToken: string;
};

export type SessionResult = {
  user: { id: string; email: string; name: string };
  refreshToken: string;
};

export type AuthResponseData = {
  id: string;
  email: string;
  name: string;
  token: string;
  refreshToken: string;
};
