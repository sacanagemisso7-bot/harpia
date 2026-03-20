import { storeFile } from "@/lib/storage/provider";

export async function storeResumeFile(params: {
  organizationId: string;
  candidateId: string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType?: string;
}) {
  return storeFile(params);
}
