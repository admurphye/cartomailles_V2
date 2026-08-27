"use client";

import type { ImportedPatternType } from "@/app/lib/pdf/types";
import type { VisionChartAnalysis } from "./visionAnalysis";

export type RasterBox = { x: number; y: number; width: number; height: number; pixels: number; major?: number; minor?: number; holes?: number };
type RecognizedBox = RasterBox & { stitch: "ml" | "ms" | "db" | "br" | "dbr"; confidence: number };

export function classifyRasterBox(box: RasterBox): RecognizedBox | null {
  const major = box.major ?? Math.max(box.width, box.height);
  const minor = box.minor ?? Math.min(box.width, box.height);
  const aspect = major / Math.max(minor, 1);
  const fill = box.pixels / (box.width * box.height);
  if (box.width < 3 || box.height < 3 || fill > 0.72) return null;
  if ((box.holes ?? 0) > 0 && aspect >= 1.2 && aspect <= 5.5) return { ...box, stitch: "ml", confidence: 0.84 };
  if (aspect <= 1.65 && fill >= 0.08 && fill <= 0.58) return { ...box, stitch: "ms", confidence: 0.58 };
  if (aspect > 1.65 && major >= 10) {
    const stitch = aspect > 5.5 ? "dbr" : aspect > 3.2 ? "br" : "db";
    return { ...box, stitch, confidence: 0.48 };
  }
  return null;
}

function components(image: ImageData): RasterBox[] {
  const { width, height, data } = image;
  const ink = new Uint8Array(width * height);
  for (let index = 0; index < ink.length; index++) {
    const offset = index * 4;
    const red = data[offset], green = data[offset + 1], blue = data[offset + 2];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    ink[index] = data[offset + 3] > 40 && (luminance < 155 || (luminance < 225 && chroma > 35)) ? 1 : 0;
  }
  const seen = new Uint8Array(ink.length);
  const result: RasterBox[] = [];
  for (let start = 0; start < ink.length; start++) {
    if (!ink[start] || seen[start]) continue;
    const queue = [start]; seen[start] = 1;
    let cursor = 0, minX = width, minY = height, maxX = 0, maxY = 0, pixels = 0;
    let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
    while (cursor < queue.length) {
      const current = queue[cursor++]; const x = current % width; const y = Math.floor(current / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); pixels++;
      sumX += x; sumY += y; sumXX += x * x; sumYY += y * y; sumXY += x * y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx; if (ink[next] && !seen[next]) { seen[next] = 1; queue.push(next); }
      }
    }
    const meanX = sumX / pixels, meanY = sumY / pixels;
    const varianceX = sumXX / pixels - meanX * meanX, varianceY = sumYY / pixels - meanY * meanY, covariance = sumXY / pixels - meanX * meanY;
    const trace = varianceX + varianceY, delta = Math.sqrt(Math.max(0, (varianceX - varianceY) ** 2 + 4 * covariance ** 2));
    const major = Math.sqrt(Math.max(0.25, (trace + delta) / 2)) * 3.5;
    const minor = Math.sqrt(Math.max(0.25, (trace - delta) / 2)) * 3.5;
    const box = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixels, major, minor, holes: countComponentHoles(queue, width, minX, minY, maxX, maxY) };
    if (pixels >= 7 && box.width < width * 0.18 && box.height < height * 0.18) result.push(box);
  }
  return result;
}

function countComponentHoles(indices: number[], imageWidth: number, minX: number, minY: number, maxX: number, maxY: number): number {
  const width = maxX - minX + 3, height = maxY - minY + 3;
  if (width * height > 20_000) return 0;
  const occupied = new Uint8Array(width * height);
  indices.forEach((index) => { const x = index % imageWidth - minX + 1; const y = Math.floor(index / imageWidth) - minY + 1; occupied[y * width + x] = 1; });
  const exterior = new Uint8Array(width * height); const queue = [0]; exterior[0] = 1; let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++], x = current % width, y = Math.floor(current / width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx; if (!occupied[next] && !exterior[next]) { exterior[next] = 1; queue.push(next); }
    }
  }
  let holes = 0; const visited = exterior.slice();
  for (let start = 0; start < visited.length; start++) {
    if (occupied[start] || visited[start]) continue; holes++; const pending = [start]; visited[start] = 1; let at = 0;
    while (at < pending.length) { const current = pending[at++], x = current % width, y = Math.floor(current / width); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue; const next = ny * width + nx; if (!occupied[next] && !visited[next]) { visited[next] = 1; pending.push(next); } } }
  }
  return holes;
}

async function fileCanvases(file: File): Promise<HTMLCanvasElement[]> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
    const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const canvases: HTMLCanvasElement[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdfDocument.numPages, 12); pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber); const initial = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 1800 / Math.max(initial.width, initial.height)); const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) continue;
      await page.render({ canvas, canvasContext: context, viewport }).promise; canvases.push(canvas);
    }
    return canvases;
  }
  const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Le navigateur ne permet pas de lire cette image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); return [canvas];
}

function groupRows(boxes: RecognizedBox[], type: ImportedPatternType) {
  const centerX = boxes.reduce((sum, box) => sum + box.x + box.width / 2, 0) / boxes.length;
  const centerY = boxes.reduce((sum, box) => sum + box.y + box.height / 2, 0) / boxes.length;
  // L'épaisseur est stable même lorsque les brides sont très longues. Utiliser
  // leur longueur fusionnait toutes les couronnes d'une rosace en un seul rang.
  const thicknesses = boxes.map((box) => box.minor ?? Math.min(box.width, box.height)).sort((a, b) => a - b);
  const tolerance = Math.min(13, Math.max(5, (thicknesses[Math.floor(thicknesses.length / 2)] || 5) * 1.35));
  const ordered = boxes.map((box) => ({ box, key: type === "flat" ? box.y + box.height / 2 : Math.hypot(box.x + box.width / 2 - centerX, box.y + box.height / 2 - centerY) })).sort((a, b) => a.key - b.key);
  const rows: RecognizedBox[][] = [];
  for (const item of ordered) {
    const row = rows.at(-1); const mean = row ? row.reduce((sum, box) => sum + (type === "flat" ? box.y + box.height / 2 : Math.hypot(box.x + box.width / 2 - centerX, box.y + box.height / 2 - centerY)), 0) / row.length : 0;
    if (!row || Math.abs(item.key - mean) > tolerance) rows.push([item.box]); else row.push(item.box);
  }
  return rows;
}

export async function analyzeRasterChart(file: File, type: ImportedPatternType): Promise<VisionChartAnalysis> {
  const canvases = await fileCanvases(file);
  let best: RecognizedBox[] = []; let bestPage = 1;
  canvases.forEach((canvas, index) => {
    const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) return;
    const found = components(context.getImageData(0, 0, canvas.width, canvas.height)).map(classifyRasterBox).filter((box): box is RecognizedBox => box !== null);
    if (found.length > best.length) { best = found; bestPage = index + 1; }
  });
  if (!best.length) return { diagramType: type, confidence: 0, rows: [], warnings: ["Aucun symbole géométrique net n’a été reconnu."] };
  const grouped = groupRows(best, type).filter((row) => row.length > 0);
  const centerX = best.reduce((sum, box) => sum + box.x + box.width / 2, 0) / best.length;
  const centerY = best.reduce((sum, box) => sum + box.y + box.height / 2, 0) / best.length;
  const rows = grouped.map((row, index) => {
    const ordered = [...row].sort((left, right) => {
      if (type === "flat") return left.x - right.x;
      const leftAngle = Math.atan2(left.y + left.height / 2 - centerY, left.x + left.width / 2 - centerX);
      const rightAngle = Math.atan2(right.y + right.height / 2 - centerY, right.x + right.width / 2 - centerX);
      return leftAngle - rightAngle;
    });
    const runs: Array<{ stitch: RecognizedBox["stitch"]; count: number }> = [];
    ordered.forEach((box) => { const last = runs.at(-1); if (last?.stitch === box.stitch) last.count++; else runs.push({ stitch: box.stitch, count: 1 }); });
    const normalizedText = runs.map(({ stitch, count }) => `${count} ${stitch}`).join(", ");
    return { number: index + 1, normalizedText: `R${index + 1} ${normalizedText}`, confidence: row.reduce((sum, box) => sum + box.confidence, 0) / row.length, warnings: ["Vérifiez l’ordre et le type des symboles : reconnaissance géométrique expérimentale."] };
  });
  const confidence = best.reduce((sum, box) => sum + box.confidence, 0) / best.length;
  return { diagramType: type, confidence, rows, warnings: [`Analyse locale de la page ${bestPage}. ${best.length} forme(s) retenue(s).`, ...(canvases.length > 1 ? ["Le PDF contient plusieurs pages : la page comportant le plus de symboles a été choisie."] : [])] };
}
