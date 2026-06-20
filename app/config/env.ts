import "dotenv/config";

const WEAK_SECRETS = new Set(["jobtrackai", "secret", "changeme", "your-secret-key"]);

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not set in environment variables`);
  }
  return value;
}

function parseNodeEnv(): "development" | "production" | "test" {
  const env = process.env.NODE_ENV ?? "development";
  if (env === "production" || env === "test" || env === "development") {
    return env;
  }
  return "development";
}

function validateJwtSecret(secret: string, nodeEnv: string): string {
  if (nodeEnv === "production") {
    if (secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production");
    }
    if (WEAK_SECRETS.has(secret.toLowerCase())) {
      throw new Error("JWT_SECRET is too weak for production");
    }
  } else if (secret.length < 8) {
    throw new Error("JWT_SECRET must be at least 8 characters");
  } else if (secret.length < 32) {
    console.warn(
      "Warning: JWT_SECRET should be at least 32 characters before production",
    );
  }
  return secret;
}

const nodeEnv = parseNodeEnv();

export const env = {
  NODE_ENV: nodeEnv,
  DATABASE_URL: requireEnv("DATABASE_URL"),
  DB_DRIZZLE_URL: process.env.DB_DRIZZLE_URL ?? requireEnv("DATABASE_URL"),
  JWT_SECRET: validateJwtSecret(requireEnv("JWT_SECRET"), nodeEnv),
  FRONTEND_URL: requireEnv("FRONTEND_URL"),
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: (process.env.SMTP_PASS ?? "").replace(/\s/g, ""),
  EMAIL_FROM: process.env.EMAIL_FROM ?? "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? "",
  BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:8080",
  isProduction: nodeEnv === "production",
  isDevelopment: nodeEnv === "development",
  isTest: nodeEnv === "test",
} as const;

export const isSmtpConfigured = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM,
);

if (env.isProduction && !isSmtpConfigured) {
  throw new Error(
    "SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM are required in production",
  );
}
