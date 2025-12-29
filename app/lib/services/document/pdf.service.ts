/**
 * PDF Processing Service
 * Handles PDF text extraction and OCR for bill documents
 */

import pdf from "pdf-parse";
import axios from "axios";
import { performOCROnPDF } from "./ocr.service";

export interface PDFExtractionResult {
  success: boolean;
  text: string | null;
  pageCount: number;
  method: "text" | "ocr" | "none";
  error?: string;
}

export interface DocumentLink {
  url: string;
  mediaType?: string;
}

// Minimum character threshold to consider text extraction successful
const MIN_TEXT_LENGTH = 100;

// Regex to detect if PDF is likely scanned (minimal text content)
const SCANNED_PDF_PATTERN = /^[\s\n\r]*$/;

/**
 * Download a PDF from a URL
 */
async function downloadPDF(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  return Buffer.from(response.data);
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractTextFromPDF(
  pdfBuffer: Buffer
): Promise<{ text: string; pageCount: number }> {
  const data = await pdf(pdfBuffer);
  return {
    text: data.text,
    pageCount: data.numpages,
  };
}

/**
 * Check if the extracted text is meaningful (not a scanned PDF)
 */
function isTextMeaningful(text: string): boolean {
  // Remove whitespace and check length
  const cleanText = text.replace(/\s+/g, " ").trim();
  if (cleanText.length < MIN_TEXT_LENGTH) {
    return false;
  }

  // Check if text is mostly garbage characters
  const alphanumericRatio =
    (cleanText.match(/[a-zA-Z0-9]/g) || []).length / cleanText.length;
  return alphanumericRatio > 0.5;
}

/**
 * Perform OCR on a PDF buffer using the OCR service
 */
async function performOCR(pdfBuffer: Buffer): Promise<string> {
  console.log("[PDF] Attempting OCR on scanned PDF...");

  const result = await performOCROnPDF(pdfBuffer, 10, (progress) => {
    console.log(`[PDF OCR] ${progress.status} - ${Math.round(progress.progress * 100)}%`);
  });

  if (result.success && result.text) {
    console.log(`[PDF] OCR extracted ${result.text.length} characters with ${result.confidence}% confidence`);
    return result.text;
  }

  if (result.error) {
    console.log(`[PDF] OCR failed: ${result.error}`);
  }

  return "";
}

/**
 * Main function to extract text from a PDF URL
 */
export async function extractTextFromPDFUrl(
  url: string
): Promise<PDFExtractionResult> {
  try {
    console.log(`[PDF] Downloading PDF from: ${url}`);
    const pdfBuffer = await downloadPDF(url);
    console.log(`[PDF] Downloaded ${pdfBuffer.length} bytes`);

    // Try standard text extraction first
    console.log("[PDF] Attempting text extraction...");
    const { text, pageCount } = await extractTextFromPDF(pdfBuffer);

    if (isTextMeaningful(text)) {
      console.log(
        `[PDF] Successfully extracted ${text.length} characters from ${pageCount} pages`
      );
      return {
        success: true,
        text,
        pageCount,
        method: "text",
      };
    }

    // If text extraction failed or returned garbage, try OCR
    console.log("[PDF] Text extraction yielded poor results, attempting OCR...");
    const ocrText = await performOCR(pdfBuffer);

    if (ocrText && ocrText.length > MIN_TEXT_LENGTH) {
      console.log(`[PDF] OCR extracted ${ocrText.length} characters`);
      return {
        success: true,
        text: ocrText,
        pageCount,
        method: "ocr",
      };
    }

    // Neither method worked
    console.log("[PDF] Could not extract meaningful text from PDF");
    return {
      success: false,
      text: null,
      pageCount,
      method: "none",
      error: "Could not extract text from PDF (may be image-only or protected)",
    };
  } catch (error) {
    console.error("[PDF] Error processing PDF:", error);
    return {
      success: false,
      text: null,
      pageCount: 0,
      method: "none",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process multiple document links and extract text from PDFs
 */
export async function processDocumentLinks(
  links: DocumentLink[]
): Promise<Map<string, PDFExtractionResult>> {
  const results = new Map<string, PDFExtractionResult>();

  for (const link of links) {
    // Only process PDFs
    if (
      link.mediaType?.includes("pdf") ||
      link.url.toLowerCase().endsWith(".pdf")
    ) {
      const result = await extractTextFromPDFUrl(link.url);
      results.set(link.url, result);
    }
  }

  return results;
}

/**
 * Extract the best available document text for a bill
 * Prefers versions over documents, and newer over older
 */
export async function extractBillText(
  versions: DocumentLink[],
  documents: DocumentLink[]
): Promise<PDFExtractionResult | null> {
  // Try versions first (usually the official bill text)
  for (const version of versions) {
    if (
      version.mediaType?.includes("pdf") ||
      version.url.toLowerCase().endsWith(".pdf")
    ) {
      const result = await extractTextFromPDFUrl(version.url);
      if (result.success) {
        return result;
      }
    }
  }

  // Fall back to documents
  for (const doc of documents) {
    if (
      doc.mediaType?.includes("pdf") ||
      doc.url.toLowerCase().endsWith(".pdf")
    ) {
      const result = await extractTextFromPDFUrl(doc.url);
      if (result.success) {
        return result;
      }
    }
  }

  return null;
}
