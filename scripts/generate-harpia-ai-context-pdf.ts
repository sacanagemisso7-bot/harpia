import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

const root = process.cwd();
const inputPath = path.join(root, "docs", "harpia-ai-context.md");
const outputPath = path.join(root, "docs", "harpia-ai-context.pdf");

const pageSize = {
  width: 595.28,
  height: 841.89
};

const margin = {
  top: 64,
  right: 54,
  bottom: 58,
  left: 54
};

const palette = {
  ink: rgb(15 / 255, 16 / 255, 18 / 255),
  muted: rgb(88 / 255, 84 / 255, 76 / 255),
  paper: rgb(248 / 255, 245 / 255, 238 / 255),
  cover: rgb(11 / 255, 11 / 255, 12 / 255),
  coverMuted: rgb(207 / 255, 202 / 255, 194 / 255),
  accent: rgb(214 / 255, 198 / 255, 165 / 255),
  line: rgb(213 / 255, 207 / 255, 195 / 255),
  surface: rgb(239 / 255, 234 / 255, 224 / 255)
};

function sanitize(text: string) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–|—/g, "-")
    .replace(/→/g, "->")
    .replace(/…/g, "...")
    .replace(/\t/g, "  ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let partial = "";
      for (const char of word) {
        const attempt = `${partial}${char}`;
        if (font.widthOfTextAtSize(attempt, size) > maxWidth && partial) {
          lines.push(partial);
          partial = char;
        } else {
          partial = attempt;
        }
      }
      current = partial;
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawPageBase(page: PDFPage, pageNumber: number, totalPages?: number) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageSize.width,
    height: pageSize.height,
    color: palette.paper
  });

  page.drawLine({
    start: { x: margin.left, y: pageSize.height - 38 },
    end: { x: pageSize.width - margin.right, y: pageSize.height - 38 },
    thickness: 0.8,
    color: palette.line
  });

  page.drawLine({
    start: { x: margin.left, y: 42 },
    end: { x: pageSize.width - margin.right, y: 42 },
    thickness: 0.8,
    color: palette.line
  });

  page.drawText("HARPIA / AI CONTEXT", {
    x: margin.left,
    y: pageSize.height - 29,
    size: 7.5,
    color: palette.muted
  });

  page.drawText(totalPages ? `${pageNumber} / ${totalPages}` : String(pageNumber), {
    x: pageSize.width - margin.right - 36,
    y: 27,
    size: 7.5,
    color: palette.muted
  });
}

function drawCover(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageSize.width,
    height: pageSize.height,
    color: palette.cover
  });

  page.drawCircle({
    x: pageSize.width - 82,
    y: pageSize.height - 120,
    size: 160,
    color: palette.accent,
    opacity: 0.08
  });

  page.drawCircle({
    x: 54,
    y: 104,
    size: 128,
    color: palette.accent,
    opacity: 0.055
  });

  page.drawText("HARPIA", {
    x: 58,
    y: pageSize.height - 172,
    size: 42,
    font: fonts.bold,
    color: palette.accent
  });

  page.drawText("CONTEXTO COMPLETO PARA IA", {
    x: 60,
    y: pageSize.height - 205,
    size: 10,
    font: fonts.bold,
    color: palette.coverMuted,
    opacity: 0.82
  });

  const lines = [
    "People & Internal Operations OS",
    "Produto, arquitetura, dominios, IA, workflows e diretrizes para continuar o codigo com seguranca."
  ];

  let y = pageSize.height - 294;
  for (const line of lines) {
    const wrapped = wrapText(line, fonts.regular, 17, 420);
    for (const item of wrapped) {
      page.drawText(item, {
        x: 60,
        y,
        size: 17,
        font: fonts.regular,
        color: palette.paper,
        opacity: 0.92
      });
      y -= 28;
    }
  }

  page.drawLine({
    start: { x: 60, y: 138 },
    end: { x: 270, y: 138 },
    thickness: 1,
    color: palette.accent,
    opacity: 0.7
  });

  page.drawText("Gerado a partir de docs/harpia-ai-context.md", {
    x: 60,
    y: 104,
    size: 9,
    font: fonts.regular,
    color: palette.coverMuted,
    opacity: 0.72
  });
}

type RenderState = {
  page: PDFPage;
  y: number;
  pageNumber: number;
};

function ensureSpace(pdf: PDFDocument, state: RenderState, needed: number) {
  if (state.y - needed >= margin.bottom) {
    return state;
  }

  const page = pdf.addPage([pageSize.width, pageSize.height]);
  const nextState = {
    page,
    y: pageSize.height - margin.top,
    pageNumber: state.pageNumber + 1
  };

  drawPageBase(page, nextState.pageNumber);
  return nextState;
}

function drawWrapped(state: RenderState, input: {
  text: string;
  font: PDFFont;
  size: number;
  lineHeight: number;
  color: ReturnType<typeof rgb>;
  indent?: number;
}) {
  const maxWidth = pageSize.width - margin.left - margin.right - (input.indent ?? 0);
  const lines = wrapText(input.text, input.font, input.size, maxWidth);

  for (const line of lines) {
    state.page.drawText(line, {
      x: margin.left + (input.indent ?? 0),
      y: state.y,
      size: input.size,
      font: input.font,
      color: input.color
    });
    state.y -= input.lineHeight;
  }

  return state;
}

async function main() {
  const markdown = await readFile(inputPath, "utf8");
  const pdf = await PDFDocument.create();
  pdf.setTitle("Harpia - Contexto completo para IA");
  pdf.setAuthor("Harpia");
  pdf.setSubject("Produto, arquitetura e contexto tecnico para continuidade por IA.");
  pdf.setKeywords(["Harpia", "People Ops", "Internal Operations", "AI", "SaaS"]);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const oblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  drawCover(pdf.addPage([pageSize.width, pageSize.height]), { regular, bold });

  let state: RenderState = {
    page: pdf.addPage([pageSize.width, pageSize.height]),
    y: pageSize.height - margin.top,
    pageNumber: 2
  };
  drawPageBase(state.page, state.pageNumber);

  const lines = markdown.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      state.y -= 9;
      continue;
    }

    if (line.startsWith("# ")) {
      state = ensureSpace(pdf, state, 66);
      state.page.drawText(sanitize(line.replace(/^# /, "")), {
        x: margin.left,
        y: state.y,
        size: 22,
        font: bold,
        color: palette.ink
      });
      state.y -= 34;
      continue;
    }

    if (line.startsWith("## ")) {
      state = ensureSpace(pdf, state, 44);
      state.y -= 10;
      state.page.drawText(sanitize(line.replace(/^## /, "")), {
        x: margin.left,
        y: state.y,
        size: 14,
        font: bold,
        color: palette.ink
      });
      state.page.drawLine({
        start: { x: margin.left, y: state.y - 7 },
        end: { x: pageSize.width - margin.right, y: state.y - 7 },
        thickness: 0.8,
        color: palette.line
      });
      state.y -= 25;
      continue;
    }

    if (line.startsWith("### ")) {
      state = ensureSpace(pdf, state, 30);
      state.page.drawText(sanitize(line.replace(/^### /, "")), {
        x: margin.left,
        y: state.y,
        size: 10.8,
        font: bold,
        color: palette.ink
      });
      state.y -= 19;
      continue;
    }

    if (line.startsWith("- ")) {
      const bulletText = line.replace(/^- /, "");
      state = ensureSpace(pdf, state, 28);
      state.page.drawCircle({
        x: margin.left + 3,
        y: state.y + 3.5,
        size: 1.7,
        color: palette.accent
      });
      state = drawWrapped(state, {
        text: bulletText,
        font: regular,
        size: 9.2,
        lineHeight: 13.2,
        color: palette.ink,
        indent: 14
      });
      state.y -= 2;
      continue;
    }

    if (line.endsWith(":") && line.length < 72) {
      state = ensureSpace(pdf, state, 24);
      state.page.drawText(sanitize(line), {
        x: margin.left,
        y: state.y,
        size: 9.6,
        font: bold,
        color: palette.ink
      });
      state.y -= 16;
      continue;
    }

    state = ensureSpace(pdf, state, 38);
    state = drawWrapped(state, {
      text: line,
      font: line.startsWith("`") ? oblique : regular,
      size: 9.4,
      lineHeight: 13.8,
      color: line.startsWith("`") ? palette.muted : palette.ink
    });
    state.y -= 3;
  }

  const totalPages = pdf.getPageCount();
  pdf.getPages().forEach((page, index) => {
    if (index === 0) {
      return;
    }
    page.drawRectangle({
      x: pageSize.width - margin.right - 48,
      y: 21,
      width: 54,
      height: 14,
      color: palette.paper
    });
    page.drawText(`${index + 1} / ${totalPages}`, {
      x: pageSize.width - margin.right - 36,
      y: 27,
      size: 7.5,
      color: palette.muted
    });
  });

  const bytes = await pdf.save();
  await writeFile(outputPath, bytes);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
