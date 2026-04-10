import { z } from "zod";

const optionalString = () =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const optionalUrl = () =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: optionalUrl(),
  AI_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
  OPENAI_API_KEY: optionalString(),
  OPENAI_BASE_URL: optionalUrl(),
  OPENAI_RESUME_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_API_KEY: optionalString(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  FILE_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: optionalString(),
  S3_REGION: optionalString(),
  S3_ENDPOINT: optionalString(),
  S3_ACCESS_KEY_ID: optionalString(),
  S3_SECRET_ACCESS_KEY: optionalString(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .transform((value) => value === "true")
    .default("false"),
  SMTP_HOST: optionalString(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .transform((value) => value === "true")
    .default("false"),
  SMTP_USER: optionalString(),
  SMTP_PASSWORD: optionalString(),
  EMAIL_FROM: z.string().default("Harpia <noreply@harpia.app>"),
  GOOGLE_CALENDAR_ID: optionalString(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: optionalString(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: optionalString(),
  STRIPE_SECRET_KEY: optionalString(),
  STRIPE_WEBHOOK_SECRET: optionalString(),
  STRIPE_PRICE_STARTER_MONTHLY: optionalString(),
  STRIPE_PRICE_STARTER_ANNUAL: optionalString(),
  STRIPE_PRICE_GROWTH_MONTHLY: optionalString(),
  STRIPE_PRICE_GROWTH_ANNUAL: optionalString(),
  STRIPE_PRICE_BUSINESS_MONTHLY: optionalString(),
  STRIPE_PRICE_BUSINESS_ANNUAL: optionalString(),
  CRON_SECRET: optionalString(),
  BACKGROUND_JOBS_INLINE: z
    .string()
    .transform((value) => value !== "false")
    .default("true"),
  REVENUE_OPS_EMAILS: optionalString(),
  OBSERVABILITY_WEBHOOK_URL: optionalUrl(),
  OBSERVABILITY_SERVICE_NAME: z.string().default("hireflow-ai"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./uploads")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_RESUME_MODEL: process.env.OPENAI_RESUME_MODEL,
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  FILE_STORAGE_DRIVER: process.env.FILE_STORAGE_DRIVER,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_STARTER_MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  STRIPE_PRICE_STARTER_ANNUAL: process.env.STRIPE_PRICE_STARTER_ANNUAL,
  STRIPE_PRICE_GROWTH_MONTHLY: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
  STRIPE_PRICE_GROWTH_ANNUAL: process.env.STRIPE_PRICE_GROWTH_ANNUAL,
  STRIPE_PRICE_BUSINESS_MONTHLY: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  STRIPE_PRICE_BUSINESS_ANNUAL: process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
  CRON_SECRET: process.env.CRON_SECRET,
  BACKGROUND_JOBS_INLINE: process.env.BACKGROUND_JOBS_INLINE,
  REVENUE_OPS_EMAILS: process.env.REVENUE_OPS_EMAILS,
  OBSERVABILITY_WEBHOOK_URL: process.env.OBSERVABILITY_WEBHOOK_URL,
  OBSERVABILITY_SERVICE_NAME: process.env.OBSERVABILITY_SERVICE_NAME,
  APP_URL: process.env.APP_URL,
  UPLOAD_DIR: process.env.UPLOAD_DIR
});
