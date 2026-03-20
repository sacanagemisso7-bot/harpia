import nodemailer from "nodemailer";

import { env } from "@/lib/env";

let transporter: nodemailer.Transporter | null = null;

export function isEmailConfigured() {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.EMAIL_FROM);
}

export function getEmailTransporter() {
  if (!isEmailConfigured()) {
    throw new Error("SMTP settings are not configured.");
  }

  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD
    }
  });

  return transporter;
}
