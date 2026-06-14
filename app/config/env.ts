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
  EMAIL_API_KEY: process.env.EMAIL_API_KEY ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "",
  isProduction: nodeEnv === "production",
  isDevelopment: nodeEnv === "development",
  isTest: nodeEnv === "test",
} as const;

if (env.isProduction) {
  if (!env.EMAIL_API_KEY) {
    throw new Error("EMAIL_API_KEY is required in production");
  }
  if (!env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is required in production");
  }
}
