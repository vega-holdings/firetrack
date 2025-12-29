import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock axios
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock pdf-parse
vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

// Mock OCR service to prevent actual Tesseract workers from starting
vi.mock("@/lib/services/document/ocr.service", () => ({
  performOCROnPDF: vi.fn().mockResolvedValue({
    success: false,
    text: null,
    confidence: 0,
    error: "OCR not available in tests",
  }),
  performOCROnImage: vi.fn().mockResolvedValue({
    success: false,
    text: null,
    confidence: 0,
    error: "OCR not available in tests",
  }),
  terminateOCRWorker: vi.fn().mockResolvedValue(undefined),
}));

import {
  extractTextFromPDFUrl,
  processDocumentLinks,
  extractBillText,
} from "@/lib/services/document/pdf.service";

describe("PDF Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("extractTextFromPDFUrl", () => {
    it("should extract text from a valid PDF URL", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");

      // Mock PDF download
      const mockPdfBuffer = Buffer.from("mock pdf content");
      vi.mocked(axios.default.get).mockResolvedValue({
        data: mockPdfBuffer,
      });

      // Mock PDF parsing - text must be >100 chars and >50% alphanumeric to pass isTextMeaningful
      vi.mocked(pdf.default).mockResolvedValue({
        text: "This is a test bill about firearms and ammunition regulations. The proposed legislation would establish new requirements for firearms dealers and implement safety standards for ammunition storage and handling.",
        numpages: 2,
        info: {},
        metadata: null,
        version: "1.0",
      });

      const result = await extractTextFromPDFUrl("https://example.com/bill.pdf");

      expect(result.success).toBe(true);
      expect(result.text).toContain("firearms");
      expect(result.pageCount).toBe(2);
      expect(result.method).toBe("text");
    });

    it("should handle download errors gracefully", async () => {
      const axios = await import("axios");

      vi.mocked(axios.default.get).mockRejectedValue(new Error("Network error"));

      const result = await extractTextFromPDFUrl("https://example.com/bill.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
      expect(result.method).toBe("none");
    });

    it("should handle PDF parsing errors gracefully", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");

      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("invalid pdf"),
      });

      vi.mocked(pdf.default).mockRejectedValue(new Error("Invalid PDF"));

      const result = await extractTextFromPDFUrl("https://example.com/bill.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PDF");
    });

    it("should detect scanned PDFs with minimal text and attempt OCR", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");
      const ocrService = await import("@/lib/services/document/ocr.service");

      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("mock pdf"),
      });

      // Return minimal/garbage text (simulating scanned PDF)
      vi.mocked(pdf.default).mockResolvedValue({
        text: "   \n\n   ",
        numpages: 5,
        info: {},
        metadata: null,
        version: "1.0",
      });

      const result = await extractTextFromPDFUrl("https://example.com/scanned.pdf");

      // Should attempt OCR for scanned PDFs
      expect(ocrService.performOCROnPDF).toHaveBeenCalled();
      // Since OCR is mocked to fail, method should be "none"
      expect(result.method).toBe("none");
      expect(result.success).toBe(false);
    });
  });

  describe("processDocumentLinks", () => {
    it("should only process PDF links", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");

      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("mock pdf"),
      });

      // Text must be >100 chars and >50% alphanumeric to pass isTextMeaningful
      vi.mocked(pdf.default).mockResolvedValue({
        text: "Bill text content here with sufficient length for testing purposes. This legislation proposes comprehensive reforms to existing firearms regulations including background check requirements.",
        numpages: 1,
        info: {},
        metadata: null,
        version: "1.0",
      });

      const links = [
        { url: "https://example.com/doc.pdf", mediaType: "application/pdf" },
        { url: "https://example.com/page.html", mediaType: "text/html" },
        { url: "https://example.com/other.pdf" }, // No mediaType but .pdf extension
      ];

      const results = await processDocumentLinks(links);

      // Should only process PDF links
      expect(results.size).toBe(2);
      expect(results.has("https://example.com/doc.pdf")).toBe(true);
      expect(results.has("https://example.com/other.pdf")).toBe(true);
      expect(results.has("https://example.com/page.html")).toBe(false);
    });
  });

  describe("extractBillText", () => {
    it("should prefer versions over documents", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");

      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("mock pdf"),
      });

      let callCount = 0;
      vi.mocked(pdf.default).mockImplementation(async () => {
        callCount++;
        return {
          // Text must be >100 chars and >50% alphanumeric to pass isTextMeaningful
          text:
            callCount === 1
              ? "Version text from enrolled bill with enough content for testing. This is the official enrolled version of the firearms legislation that has been approved by both chambers of congress."
              : "Document text should not be used since version succeeded. This fallback document contains secondary reference materials and supporting documentation.",
          numpages: 1,
          info: {},
          metadata: null,
          version: "1.0",
        };
      });

      const versions = [
        { url: "https://example.com/version.pdf", mediaType: "application/pdf" },
      ];
      const documents = [
        { url: "https://example.com/doc.pdf", mediaType: "application/pdf" },
      ];

      const result = await extractBillText(versions, documents);

      expect(result).not.toBeNull();
      expect(result?.text).toContain("Version text");
      // Should only call once (version succeeded, no need for document)
      expect(callCount).toBe(1);
    });

    it("should fall back to documents if versions fail", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");

      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("mock pdf"),
      });

      let callCount = 0;
      vi.mocked(pdf.default).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Version PDF corrupted");
        }
        return {
          // Text must be >100 chars and >50% alphanumeric to pass isTextMeaningful
          text: "Document text as fallback with sufficient content for the test. This fallback document provides the full text of the proposed firearms legislation including all amendments and committee revisions.",
          numpages: 1,
          info: {},
          metadata: null,
          version: "1.0",
        };
      });

      const versions = [
        { url: "https://example.com/version.pdf", mediaType: "application/pdf" },
      ];
      const documents = [
        { url: "https://example.com/doc.pdf", mediaType: "application/pdf" },
      ];

      const result = await extractBillText(versions, documents);

      expect(result).not.toBeNull();
      expect(result?.text).toContain("Document text");
    });

    it("should return null if no PDFs can be processed", async () => {
      const versions = [
        { url: "https://example.com/version.html", mediaType: "text/html" },
      ];
      const documents = [
        { url: "https://example.com/doc.html", mediaType: "text/html" },
      ];

      const result = await extractBillText(versions, documents);

      expect(result).toBeNull();
    });
  });
});
