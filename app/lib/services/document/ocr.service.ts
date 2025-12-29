/**
 * OCR Service
 * Handles optical character recognition for scanned PDFs
 */

import Tesseract, { createWorker } from "tesseract.js";
import sharp from "sharp";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { randomUUID } from "crypto";

export interface OCRResult {
  success: boolean;
  text: string | null;
  confidence: number;
  error?: string;
}

export interface OCRProgress {
  status: string;
  progress: number;
}

// Tesseract worker instance (lazy initialized)
let tesseractWorker: Tesseract.Worker | null = null;

/**
 * Initialize the Tesseract worker
 */
async function getWorker(): Promise<Tesseract.Worker> {
  if (!tesseractWorker) {
    tesseractWorker = await createWorker("eng", 1, {
      logger: (m) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`[OCR] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`);
        }
      },
    });
  }
  return tesseractWorker;
}

/**
 * Cleanup the Tesseract worker
 */
export async function terminateOCRWorker(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}

/**
 * Preprocess image for better OCR results
 * - Convert to grayscale
 * - Increase contrast
 * - Apply threshold for binarization
 */
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .grayscale()
    .normalize() // Enhance contrast
    .sharpen() // Sharpen text edges
    .threshold(128) // Binarize for cleaner text
    .png()
    .toBuffer();
}

/**
 * Perform OCR on an image buffer
 */
export async function performOCROnImage(
  imageBuffer: Buffer,
  preprocess: boolean = true
): Promise<OCRResult> {
  try {
    const worker = await getWorker();

    // Preprocess image if requested
    const processedImage = preprocess
      ? await preprocessImage(imageBuffer)
      : imageBuffer;

    const {
      data: { text, confidence },
    } = await worker.recognize(processedImage);

    return {
      success: true,
      text: text.trim(),
      confidence,
    };
  } catch (error) {
    console.error("[OCR] Error performing OCR:", error);
    return {
      success: false,
      text: null,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown OCR error",
    };
  }
}

/**
 * Perform OCR on multiple images and combine results
 */
export async function performOCROnImages(
  imageBuffers: Buffer[],
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const results: string[] = [];
  let totalConfidence = 0;

  for (let i = 0; i < imageBuffers.length; i++) {
    if (onProgress) {
      onProgress({
        status: `Processing page ${i + 1} of ${imageBuffers.length}`,
        progress: i / imageBuffers.length,
      });
    }

    const result = await performOCROnImage(imageBuffers[i]);
    if (result.success && result.text) {
      results.push(result.text);
      totalConfidence += result.confidence;
    }
  }

  if (results.length === 0) {
    return {
      success: false,
      text: null,
      confidence: 0,
      error: "No text could be extracted from any page",
    };
  }

  return {
    success: true,
    text: results.join("\n\n--- Page Break ---\n\n"),
    confidence: totalConfidence / results.length,
  };
}

/**
 * Convert a PDF page to an image using pdf-poppler (if available)
 * Falls back to a simpler method if poppler is not installed
 */
export async function convertPDFPageToImage(
  pdfBuffer: Buffer,
  pageNumber: number = 1,
  dpi: number = 300
): Promise<Buffer | null> {
  const tempDir = join(tmpdir(), "firetrack-ocr");
  const tempId = randomUUID();
  const tempPdfPath = join(tempDir, `${tempId}.pdf`);
  const tempImagePath = join(tempDir, `${tempId}-${pageNumber}.png`);

  try {
    // Ensure temp directory exists
    await mkdir(tempDir, { recursive: true });

    // Write PDF to temp file
    await writeFile(tempPdfPath, pdfBuffer);

    // Try using pdf-poppler
    try {
      const { convert } = await import("pdf-poppler");
      const opts = {
        format: "png",
        out_dir: tempDir,
        out_prefix: tempId,
        page: pageNumber,
        scale: dpi / 72, // Convert DPI to scale factor
      };

      await convert(tempPdfPath, opts);

      // Read the generated image
      const imageBuffer = await readFile(tempImagePath);
      return imageBuffer;
    } catch (popplerError) {
      // pdf-poppler requires system poppler installation
      console.warn(
        "[OCR] pdf-poppler not available, OCR on scanned PDFs may be limited:",
        popplerError instanceof Error ? popplerError.message : "Unknown error"
      );
      return null;
    }
  } catch (error) {
    console.error("[OCR] Error converting PDF to image:", error);
    return null;
  } finally {
    // Cleanup temp files
    try {
      await unlink(tempPdfPath).catch(() => {});
      await unlink(tempImagePath).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Perform OCR on a PDF buffer
 * Converts each page to an image and runs OCR
 */
export async function performOCROnPDF(
  pdfBuffer: Buffer,
  maxPages: number = 10,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  try {
    // Get page count from pdf-parse
    const pdf = await import("pdf-parse");
    const pdfData = await pdf.default(pdfBuffer);
    const pageCount = Math.min(pdfData.numpages, maxPages);

    if (onProgress) {
      onProgress({
        status: `PDF has ${pdfData.numpages} pages, processing first ${pageCount}`,
        progress: 0,
      });
    }

    // Convert each page to image and perform OCR
    const imageBuffers: Buffer[] = [];

    for (let page = 1; page <= pageCount; page++) {
      if (onProgress) {
        onProgress({
          status: `Converting page ${page} to image`,
          progress: (page - 1) / (pageCount * 2),
        });
      }

      const imageBuffer = await convertPDFPageToImage(pdfBuffer, page);
      if (imageBuffer) {
        imageBuffers.push(imageBuffer);
      }
    }

    if (imageBuffers.length === 0) {
      return {
        success: false,
        text: null,
        confidence: 0,
        error:
          "Could not convert PDF pages to images. Ensure poppler-utils is installed on the system.",
      };
    }

    // Perform OCR on all images
    return performOCROnImages(imageBuffers, (p) => {
      if (onProgress) {
        onProgress({
          status: p.status,
          progress: 0.5 + p.progress * 0.5,
        });
      }
    });
  } catch (error) {
    console.error("[OCR] Error performing OCR on PDF:", error);
    return {
      success: false,
      text: null,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
