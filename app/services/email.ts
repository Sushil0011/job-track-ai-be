import { Resend } from "resend";
import { env } from "../config/env";

export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) => {
  if (!env.EMAIL_API_KEY) {
    console.info(
      `[dev] Password reset email for ${to}: ${resetUrl}`,
    );
    return;
  }

  const resend = new Resend(env.EMAIL_API_KEY);

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your JobTrack AI password",
    html: `
      <p>You requested a password reset for your JobTrack AI account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `,
  });
};
