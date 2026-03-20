import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";

export type StoreScopedFileInput = {
  organizationId: string;
  pathSegments: string[];
  fileName: string;
  fileBuffer: Buffer;
  mimeType?: string;
};

export type StoreFileInput = {
  organizationId: string;
  candidateId: string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType?: string;
};

export type StoredFile = {
  storageKey: string;
  absolutePath?: string;
  provider: "local" | "s3";
};

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function buildStorageKey(params: Pick<StoreScopedFileInput, "organizationId" | "pathSegments" | "fileName">) {
  const safeName = sanitizeFileName(params.fileName);
  const normalizedSegments = params.pathSegments.map((segment) => sanitizeFileName(segment)).join("/");
  return `${params.organizationId}/${normalizedSegments}/${Date.now()}-${safeName}`;
}

async function storeLocalFile(input: StoreScopedFileInput): Promise<StoredFile> {
  const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
  const storageKey = buildStorageKey(input);
  const absolutePath = path.join(uploadRoot, storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.fileBuffer);

  return {
    storageKey: storageKey.replaceAll("\\", "/"),
    absolutePath,
    provider: "local"
  };
}

function getS3Client() {
  if (
    !env.S3_BUCKET ||
    !env.S3_REGION ||
    !env.S3_ACCESS_KEY_ID ||
    !env.S3_SECRET_ACCESS_KEY
  ) {
    throw new Error("S3 storage is not fully configured.");
  }

  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY
    }
  });
}

async function storeS3File(input: StoreScopedFileInput): Promise<StoredFile> {
  const client = getS3Client();
  const storageKey = buildStorageKey(input);

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      Body: input.fileBuffer,
      ContentType: input.mimeType || "application/octet-stream"
    })
  );

  return {
    storageKey,
    provider: "s3"
  };
}

export function getStorageDriver() {
  return env.FILE_STORAGE_DRIVER;
}

export function isS3Configured() {
  return !!(
    env.S3_BUCKET &&
    env.S3_REGION &&
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY
  );
}

export async function storeScopedFile(input: StoreScopedFileInput): Promise<StoredFile> {
  if (env.FILE_STORAGE_DRIVER === "s3") {
    return storeS3File(input);
  }

  return storeLocalFile(input);
}

export async function storeFile(input: StoreFileInput): Promise<StoredFile> {
  return storeScopedFile({
    organizationId: input.organizationId,
    pathSegments: ["candidates", input.candidateId],
    fileName: input.fileName,
    fileBuffer: input.fileBuffer,
    mimeType: input.mimeType
  });
}
