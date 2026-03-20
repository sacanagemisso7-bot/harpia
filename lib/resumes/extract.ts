import pdfParse from "pdf-parse";

export async function extractResumeText(fileBuffer: Buffer) {
  const result = await pdfParse(fileBuffer);

  return result.text.trim();
}
