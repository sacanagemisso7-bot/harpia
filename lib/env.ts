import { z } from "zod";

const optionalString = () =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const optionalUrl = () =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());

function cleanEnvValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

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
  OBSERVABILITY_SERVICE_NAME: z.string().default("harpia"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./uploads")
});

export const env = envSchema.parse({
  DATABASE_URL: cleanEnvValue(process.env.DATABASE_URL),
  AUTH_SECRET: cleanEnvValue(process.env.AUTH_SECRET),
  NEXTAUTH_URL: cleanEnvValue(process.env.NEXTAUTH_URL),
  AI_PROVIDER: cleanEnvValue(process.env.AI_PROVIDER),
  OPENAI_API_KEY: cleanEnvValue(process.env.OPENAI_API_KEY),
  OPENAI_BASE_URL: cleanEnvValue(process.env.OPENAI_BASE_URL),
  OPENAI_RESUME_MODEL: cleanEnvValue(process.env.OPENAI_RESUME_MODEL),
  OPENAI_CHAT_MODEL: cleanEnvValue(process.env.OPENAI_CHAT_MODEL),
  GEMINI_API_KEY: cleanEnvValue(process.env.GEMINI_API_KEY),
  GEMINI_MODEL: cleanEnvValue(process.env.GEMINI_MODEL),
  FILE_STORAGE_DRIVER: cleanEnvValue(process.env.FILE_STORAGE_DRIVER),
  S3_BUCKET: cleanEnvValue(process.env.S3_BUCKET),
  S3_REGION: cleanEnvValue(process.env.S3_REGION),
  S3_ENDPOINT: cleanEnvValue(process.env.S3_ENDPOINT),
  S3_ACCESS_KEY_ID: cleanEnvValue(process.env.S3_ACCESS_KEY_ID),
  S3_SECRET_ACCESS_KEY: cleanEnvValue(process.env.S3_SECRET_ACCESS_KEY),
  S3_FORCE_PATH_STYLE: cleanEnvValue(process.env.S3_FORCE_PATH_STYLE),
  SMTP_HOST: cleanEnvValue(process.env.SMTP_HOST),
  SMTP_PORT: cleanEnvValue(process.env.SMTP_PORT),
  SMTP_SECURE: cleanEnvValue(process.env.SMTP_SECURE),
  SMTP_USER: cleanEnvValue(process.env.SMTP_USER),
  SMTP_PASSWORD: cleanEnvValue(process.env.SMTP_PASSWORD),
  EMAIL_FROM: cleanEnvValue(process.env.EMAIL_FROM),
  GOOGLE_CALENDAR_ID: cleanEnvValue(process.env.GOOGLE_CALENDAR_ID),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: cleanEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: cleanEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
  STRIPE_SECRET_KEY: cleanEnvValue(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: cleanEnvValue(process.env.STRIPE_WEBHOOK_SECRET),
  STRIPE_PRICE_STARTER_MONTHLY: cleanEnvValue(process.env.STRIPE_PRICE_STARTER_MONTHLY),
  STRIPE_PRICE_STARTER_ANNUAL: cleanEnvValue(process.env.STRIPE_PRICE_STARTER_ANNUAL),
  STRIPE_PRICE_GROWTH_MONTHLY: cleanEnvValue(process.env.STRIPE_PRICE_GROWTH_MONTHLY),
  STRIPE_PRICE_GROWTH_ANNUAL: cleanEnvValue(process.env.STRIPE_PRICE_GROWTH_ANNUAL),
  STRIPE_PRICE_BUSINESS_MONTHLY: cleanEnvValue(process.env.STRIPE_PRICE_BUSINESS_MONTHLY),
  STRIPE_PRICE_BUSINESS_ANNUAL: cleanEnvValue(process.env.STRIPE_PRICE_BUSINESS_ANNUAL),
  CRON_SECRET: cleanEnvValue(process.env.CRON_SECRET),
  BACKGROUND_JOBS_INLINE: cleanEnvValue(process.env.BACKGROUND_JOBS_INLINE),
  REVENUE_OPS_EMAILS: cleanEnvValue(process.env.REVENUE_OPS_EMAILS),
  OBSERVABILITY_WEBHOOK_URL: cleanEnvValue(process.env.OBSERVABILITY_WEBHOOK_URL),
  OBSERVABILITY_SERVICE_NAME: cleanEnvValue(process.env.OBSERVABILITY_SERVICE_NAME),
  APP_URL: cleanEnvValue(process.env.APP_URL),
  UPLOAD_DIR: cleanEnvValue(process.env.UPLOAD_DIR)
});
