import nodemailer from "nodemailer";
import { env, isSmtpConfigured } from "../config/env";
import { httpError } from "../utils/httpError";

const buildResetEmailHtml = (resetUrl: string) => `
  <p>You requested a password reset for your JobTrack AI account.</p>
  <p><a href="${resetUrl}">Reset your password</a></p>
  <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
`;

const resolveFromAddress = (): string => {
  const displayNameMatch = env.EMAIL_FROM.match(/^(.+?)\s*</);
  const displayName = displayNameMatch?.[1]?.trim() ?? "JobTrack AI";
  const fromEmailMatch = env.EMAIL_FROM.match(/<([^>]+)>/);
  const fromEmail = (fromEmailMatch?.[1] ?? env.EMAIL_FROM).trim();

  if (
    env.SMTP_HOST.includes("gmail.com") &&
    fromEmail.toLowerCase() !== env.SMTP_USER.toLowerCase()
  ) {
    console.warn(
      `[email] EMAIL_FROM (${fromEmail}) does not match Gmail account (${env.SMTP_USER}); using Gmail address as sender`,
    );
    return `${displayName} <${env.SMTP_USER}>`;
  }

  return env.EMAIL_FROM;
};

export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) => {
  if (!isSmtpConfigured) {
    console.info(`[dev] Password reset email for ${to}: ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: resolveFromAddress(),
      to,
      subject: "Reset your JobTrack AI password",
      html: buildResetEmailHtml(resetUrl),
    });

    console.info(
      `[email] Password reset sent to ${to} (id: ${info.messageId})`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email error";
    console.error("[email] SMTP failed:", message);
    throw httpError(
      env.isDevelopment
        ? message
        : "Failed to send password reset email. Please try again later.",
      502,
    );
  }
};
