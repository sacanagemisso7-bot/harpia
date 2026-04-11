import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

import { brand } from "@/lib/brand";
import { harpiaExecutiveDeck } from "@/lib/demo/harpia-executive-deck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_WIDTH = 1280;
const PAGE_HEIGHT = 720;

const palette = {
  background: rgb(11 / 255, 11 / 255, 12 / 255),
  surface: rgb(26 / 255, 26 / 255, 29 / 255),
  surfaceElevated: rgb(35 / 255, 35 / 255, 38 / 255),
  line: rgb(66 / 255, 68 / 255, 74 / 255),
  text: rgb(244 / 255, 241 / 255, 234 / 255),
  muted: rgb(207 / 255, 202 / 255, 194 / 255),
  accent: rgb(214 / 255, 198 / 255, 165 / 255),
  accentSoft: rgb(184 / 255, 169 / 255, 138 / 255),
  success: rgb(124 / 255, 157 / 255, 132 / 255)
};

function drawPageBase(page: PDFPage, index: number) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: palette.background
  });

  page.drawRectangle({
    x: 36,
    y: 36,
    width: PAGE_WIDTH - 72,
    height: PAGE_HEIGHT - 72,
    borderColor: rgb(1, 1, 1),
    borderWidth: 0
  });

  page.drawCircle({
    x: PAGE_WIDTH - 180,
    y: PAGE_HEIGHT - 120,
    size: 160,
    color: palette.accent,
    opacity: 0.04
  });

  page.drawCircle({
    x: 180,
    y: 120,
    size: 140,
    color: palette.accentSoft,
    opacity: 0.04
  });

  page.drawLine({
    start: { x: 56, y: PAGE_HEIGHT - 56 },
    end: { x: PAGE_WIDTH - 56, y: PAGE_HEIGHT - 56 },
    thickness: 1,
    color: palette.line,
    opacity: 0.55
  });

  page.drawLine({
    start: { x: 56, y: 56 },
    end: { x: PAGE_WIDTH - 56, y: 56 },
    thickness: 1,
    color: palette.line,
    opacity: 0.55
  });

  page.drawText(String(index + 1).padStart(2, "0"), {
    x: PAGE_WIDTH - 88,
    y: 28,
    size: 10,
    color: palette.muted,
    opacity: 0.7
  });
}

function drawConstellation(page: PDFPage, x: number, y: number, scale = 1) {
  const nodes = [
    { x: 0, y: 0, r: 4, active: true },
    { x: 94, y: 56, r: 3, active: false },
    { x: 148, y: -12, r: 5, active: true },
    { x: 236, y: 34, r: 3, active: false },
    { x: 298, y: -26, r: 4, active: true },
    { x: 164, y: -86, r: 3, active: false },
    { x: 54, y: -92, r: 2.5, active: false }
  ];

  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [2, 5],
    [0, 6],
    [6, 5],
    [2, 4],
    [1, 5]
  ];

  for (const [startIndex, endIndex] of links) {
    const start = nodes[startIndex];
    const end = nodes[endIndex];

    page.drawLine({
      start: { x: x + start.x * scale, y: y + start.y * scale },
      end: { x: x + end.x * scale, y: y + end.y * scale },
      thickness: 1,
      color: palette.muted,
      opacity: 0.18
    });
  }

  for (const node of nodes) {
    page.drawCircle({
      x: x + node.x * scale,
      y: y + node.y * scale,
      size: node.r * scale,
      color: node.active ? palette.accent : palette.text,
      opacity: node.active ? 0.85 : 0.25
    });

    if (node.active) {
      page.drawCircle({
        x: x + node.x * scale,
        y: y + node.y * scale,
        size: node.r * 3.2 * scale,
        color: palette.accent,
        opacity: 0.08
      });
    }
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawWrappedText(page: PDFPage, input: {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  lineHeight?: number;
  color?: ReturnType<typeof rgb>;
  opacity?: number;
}) {
  const lines = wrapText(input.text, input.font, input.size, input.maxWidth);
  const lineHeight = input.lineHeight ?? input.size * 1.42;
  let currentY = input.y;

  for (const line of lines) {
    page.drawText(line, {
      x: input.x,
      y: currentY,
      size: input.size,
      font: input.font,
      color: input.color ?? palette.text,
      opacity: input.opacity ?? 1
    });

    currentY -= lineHeight;
  }

  return currentY;
}

function drawKicker(page: PDFPage, text: string, x: number, y: number, font: PDFFont) {
  page.drawText(text.toUpperCase(), {
    x,
    y,
    size: 10,
    font,
    color: palette.accentSoft,
    opacity: 0.92
  });

  page.drawLine({
    start: { x, y: y - 8 },
    end: { x: x + 72, y: y - 8 },
    thickness: 1,
    color: palette.accentSoft,
    opacity: 0.38
  });
}

function drawMetricCard(page: PDFPage, input: {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value: string;
  detail: string;
  titleFont: PDFFont;
  bodyFont: PDFFont;
}) {
  page.drawRectangle({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    color: palette.surface,
    opacity: 0.92,
    borderColor: palette.line,
    borderWidth: 1
  });

  page.drawText(input.label.toUpperCase(), {
    x: input.x + 20,
    y: input.y + input.height - 26,
    size: 9,
    font: input.bodyFont,
    color: palette.muted,
    opacity: 0.88
  });

  page.drawText(input.value, {
    x: input.x + 20,
    y: input.y + input.height - 72,
    size: 28,
    font: input.titleFont,
    color: palette.text
  });

  drawWrappedText(page, {
    text: input.detail,
    x: input.x + 20,
    y: input.y + 26,
    maxWidth: input.width - 40,
    font: input.bodyFont,
    size: 11,
    lineHeight: 15,
    color: palette.muted,
    opacity: 0.84
  });
}

function drawModuleTile(page: PDFPage, input: {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  summary: string;
  titleFont: PDFFont;
  bodyFont: PDFFont;
}) {
  page.drawRectangle({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    color: palette.surface,
    opacity: 0.94,
    borderColor: palette.line,
    borderWidth: 1
  });

  page.drawCircle({
    x: input.x + 28,
    y: input.y + input.height - 28,
    size: 4,
    color: palette.accent,
    opacity: 0.92
  });

  page.drawText(input.name, {
    x: input.x + 20,
    y: input.y + input.height - 52,
    size: 17,
    font: input.titleFont,
    color: palette.text
  });

  drawWrappedText(page, {
    text: input.summary,
    x: input.x + 20,
    y: input.y + input.height - 82,
    maxWidth: input.width - 34,
    font: input.bodyFont,
    size: 11,
    lineHeight: 16,
    color: palette.muted,
    opacity: 0.86
  });
}

async function buildDeck() {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${brand.name} Executive Deck`);
  pdf.setAuthor(brand.name);
  pdf.setSubject("Executive product overview");
  pdf.setLanguage("pt-BR");

  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

  const logoPath = path.join(process.cwd(), "public", "brand", "harpia-mark.png");
  const logoBytes = await readFile(logoPath);
  const logo = await pdf.embedPng(logoBytes);

  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageBase(cover, 0);
  drawConstellation(cover, 760, 430, 1.18);

  cover.drawImage(logo, {
    x: 72,
    y: 580,
    width: 94,
    height: 94
  });

  drawKicker(cover, "Executive brief", 182, 640, bodyFont);

  cover.drawText(harpiaExecutiveDeck.cover.title, {
    x: 72,
    y: 520,
    size: 38,
    font: titleFont,
    color: palette.text
  });

  drawWrappedText(cover, {
    text: harpiaExecutiveDeck.cover.subtitle,
    x: 72,
    y: 468,
    maxWidth: 510,
    font: bodyFont,
    size: 16,
    lineHeight: 24,
    color: palette.muted
  });

  cover.drawText(harpiaExecutiveDeck.cover.tagline, {
    x: 72,
    y: 372,
    size: 20,
    font: titleFont,
    color: palette.accent
  });

  cover.drawRectangle({
    x: 72,
    y: 130,
    width: 494,
    height: 136,
    color: palette.surface,
    opacity: 0.94,
    borderColor: palette.line,
    borderWidth: 1
  });

  drawWrappedText(cover, {
    text: `${harpiaExecutiveDeck.company.name} opera ${harpiaExecutiveDeck.company.size}, ${harpiaExecutiveDeck.company.footprint} e cresceu ${harpiaExecutiveDeck.company.headcountGrowth}. O objetivo desta proposta e transformar RH e hiring em uma superficie unica de decisão.`,
    x: 96,
    y: 230,
    maxWidth: 450,
    font: bodyFont,
    size: 13,
    lineHeight: 20,
    color: palette.muted
  });

  harpiaExecutiveDeck.metrics.forEach((metric, index) => {
    drawMetricCard(cover, {
      x: 624 + index * 150,
      y: 90,
      width: 138,
      height: 156,
      label: metric.label,
      value: metric.value,
      detail: metric.detail,
      titleFont,
      bodyFont
    });
  });

  const strategy = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageBase(strategy, 1);
  drawKicker(strategy, "Business case", 72, 640, bodyFont);
  drawConstellation(strategy, 888, 564, 0.92);

  strategy.drawText("O que muda quando Harpia organiza a operação.", {
    x: 72,
    y: 564,
    size: 31,
    font: titleFont,
    color: palette.text
  });

  drawWrappedText(strategy, {
    text: "A decisão deixa de depender de memoria dispersa, planilhas paralelas e filas invisiveis. A liderança passa a enxergar risco, ownership e próximo passo em um único sistema.",
    x: 72,
    y: 520,
    maxWidth: 540,
    font: bodyFont,
    size: 14,
    lineHeight: 22,
    color: palette.muted
  });

  const leftCards = [
    ["Visão executiva", "Dashboard único com sinais de risco, SLA, hiring e people ops."],
    ["Decisão com critério", "Shortlists, contexto interno, entrevistas e aprovações no mesmo fluxo."],
    ["Execucao rastreavel", "Requests, tasks e workflows com ownership e cadencia operacional."]
  ];

  leftCards.forEach(([title, text], index) => {
    drawModuleTile(strategy, {
      x: 72,
      y: 292 - index * 126,
      width: 376,
      height: 104,
      name: title,
      summary: text,
      titleFont,
      bodyFont
    });
  });

  strategy.drawRectangle({
    x: 520,
    y: 110,
    width: 688,
    height: 456,
    color: palette.surface,
    opacity: 0.92,
    borderColor: palette.line,
    borderWidth: 1
  });

  drawKicker(strategy, "Fictional company snapshot", 552, 528, bodyFont);
  strategy.drawText(harpiaExecutiveDeck.company.name, {
    x: 552,
    y: 480,
    size: 32,
    font: titleFont,
    color: palette.text
  });

  const snapshotLines = [
    `Setor: ${harpiaExecutiveDeck.company.sector}`,
    `Escala: ${harpiaExecutiveDeck.company.size}`,
    `Presen?a: ${harpiaExecutiveDeck.company.footprint}`,
    `Ritmo: ${harpiaExecutiveDeck.company.headcountGrowth}`
  ];

  snapshotLines.forEach((line, index) => {
    strategy.drawText(line, {
      x: 552,
      y: 430 - index * 34,
      size: 15,
      font: bodyFont,
      color: index === 0 ? palette.text : palette.muted
    });
  });

  drawWrappedText(strategy, {
    text: "No estado atual, a companhia precisa contratar melhor, reduzir atrito em people ops, responder mais rapido a pendencias internas e sustentar compliance com evidencias claras. Harpia conecta essas frentes em uma mesma linguagem operacional.",
    x: 552,
    y: 270,
    maxWidth: 600,
    font: bodyFont,
    size: 13,
    lineHeight: 20,
    color: palette.muted
  });

  const modulePage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageBase(modulePage, 2);
  drawKicker(modulePage, "Product map", 72, 640, bodyFont);
  drawConstellation(modulePage, 1010, 170, 0.7);

  modulePage.drawText("Tudo que o software cobre, sem troca de contexto.", {
    x: 72,
    y: 580,
    size: 30,
    font: titleFont,
    color: palette.text
  });

  drawWrappedText(modulePage, {
    text: "Cada módulo foi desenhado para operar junto dos demais. O resultado não e um conjunto de telas; e uma superficie unica para decidir, executar e acompanhar.",
    x: 72,
    y: 538,
    maxWidth: 620,
    font: bodyFont,
    size: 14,
    lineHeight: 22,
    color: palette.muted
  });

  harpiaExecutiveDeck.modules.forEach((module, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);

    drawModuleTile(modulePage, {
      x: 72 + column * 378,
      y: 324 - row * 196,
      width: 336,
      height: 152,
      name: module.name,
      summary: module.summary,
      titleFont,
      bodyFont
    });
  });

  const scenariosPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageBase(scenariosPage, 3);
  drawKicker(scenariosPage, "Use cases", 72, 640, bodyFont);

  scenariosPage.drawText("Onde Harpia vira vantagem operacional rapido.", {
    x: 72,
    y: 582,
    size: 30,
    font: titleFont,
    color: palette.text
  });

  harpiaExecutiveDeck.scenarios.forEach((scenario, index) => {
    drawModuleTile(scenariosPage, {
      x: 72,
      y: 410 - index * 122,
      width: 488,
      height: 96,
      name: scenario.title,
      summary: scenario.detail,
      titleFont,
      bodyFont
    });
  });

  scenariosPage.drawRectangle({
    x: 632,
    y: 110,
    width: 576,
    height: 470,
    color: palette.surface,
    opacity: 0.94,
    borderColor: palette.line,
    borderWidth: 1
  });

  drawKicker(scenariosPage, "Rollout", 664, 542, bodyFont);

  harpiaExecutiveDeck.rollout.forEach((step, index) => {
    const y = 490 - index * 90;
    scenariosPage.drawCircle({
      x: 688,
      y,
      size: 8,
      color: index === 0 ? palette.accent : palette.accentSoft,
      opacity: 0.94
    });

    if (index < harpiaExecutiveDeck.rollout.length - 1) {
      scenariosPage.drawLine({
        start: { x: 688, y: y - 12 },
        end: { x: 688, y: y - 72 },
        thickness: 2,
        color: palette.line,
        opacity: 0.6
      });
    }

    drawWrappedText(scenariosPage, {
      text: step,
      x: 716,
      y: y + 4,
      maxWidth: 430,
      font: bodyFont,
      size: 13,
      lineHeight: 20,
      color: palette.text
    });
  });

  const closingPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageBase(closingPage, 4);
  drawConstellation(closingPage, 870, 450, 1.25);

  closingPage.drawImage(logo, {
    x: 72,
    y: 588,
    width: 84,
    height: 84
  });

  drawKicker(closingPage, "Closing view", 176, 642, bodyFont);
  closingPage.drawText("Harpia transforma operação em critério.", {
    x: 72,
    y: 560,
    size: 34,
    font: titleFont,
    color: palette.text
  });

  drawWrappedText(closingPage, {
    text: "Para um time executivo, o valor não esta em ter mais um software. Esta em consolidar leitura, contexto e ação em uma unica experiência confiavel.",
    x: 72,
    y: 510,
    maxWidth: 520,
    font: bodyFont,
    size: 15,
    lineHeight: 23,
    color: palette.muted
  });

  harpiaExecutiveDeck.closing.forEach((line, index) => {
    closingPage.drawCircle({
      x: 88,
      y: 386 - index * 48,
      size: 4,
      color: palette.success,
      opacity: 0.92
    });

    closingPage.drawText(line, {
      x: 108,
      y: 380 - index * 48,
      size: 16,
      font: bodyFont,
      color: palette.text
    });
  });

  closingPage.drawRectangle({
    x: 72,
    y: 92,
    width: 524,
    height: 96,
    color: palette.surfaceElevated,
    opacity: 0.94,
    borderColor: palette.line,
    borderWidth: 1
  });

  closingPage.drawText("Solicite a leitura completa do seu fluxo com Harpia.", {
    x: 96,
    y: 144,
    size: 16,
    font: titleFont,
    color: palette.text
  });

  closingPage.drawText(brand.supportEmail, {
    x: 96,
    y: 114,
    size: 14,
    font: bodyFont,
    color: palette.accent
  });

  closingPage.drawText("Executive operating system for hiring and people ops", {
    x: 72,
    y: 34,
    size: 11,
    font: bodyFont,
    color: palette.muted,
    opacity: 0.72
  });

  return pdf.save();
}

export async function GET() {
  const pdfBytes = await buildDeck();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="harpia-executive-deck.pdf"',
      "Cache-Control": "no-store"
    }
  });
}
