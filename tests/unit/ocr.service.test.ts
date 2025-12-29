import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock tesseract.js before importing the service
vi.mock("tesseract.js", () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: "Recognized text from image",
        confidence: 95.5,
      },
    }),
    terminate: vi.fn(),
  }),
  default: {
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: "Recognized text",
        confidence: 95,
      },
    }),
  },
}));

// Mock sharp
vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    grayscale: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    sharpen: vi.fn().mockReturnThis(),
    threshold: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed image")),
  }),
}));

// Mock fs/promises properly
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from("image content")),
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock pdf-parse
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockResolvedValue({
    text: "",
    numpages: 3,
    info: {},
    metadata: null,
    version: "1.0",
  }),
}));

// Mock pdf-poppler - module doesn't exist in test env
vi.mock("pdf-poppler", () => ({
  convert: vi.fn().mockRejectedValue(new Error("poppler not available")),
}));

describe("OCR Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("performOCROnImage", () => {
    it("should perform OCR on an image buffer", async () => {
      const { performOCROnImage } = await import(
        "@/lib/services/document/ocr.service"
      );

      const imageBuffer = Buffer.from("fake image data");
      const result = await performOCROnImage(imageBuffer);

      expect(result.success).toBe(true);
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should preprocess images by default", async () => {
      const sharp = await import("sharp");
      const { performOCROnImage } = await import(
        "@/lib/services/document/ocr.service"
      );

      vi.mocked(sharp.default).mockClear();

      const imageBuffer = Buffer.from("fake image data");
      await performOCROnImage(imageBuffer);

      // Verify sharp was called for preprocessing
      expect(sharp.default).toHaveBeenCalled();
    });

    it("should skip preprocessing when disabled", async () => {
      const sharp = await import("sharp");
      const { performOCROnImage } = await import(
        "@/lib/services/document/ocr.service"
      );

      vi.mocked(sharp.default).mockClear();

      const imageBuffer = Buffer.from("fake image data");
      await performOCROnImage(imageBuffer, false);

      // Sharp should not be called when preprocessing is disabled
      expect(sharp.default).not.toHaveBeenCalled();
    });
  });

  describe("performOCROnImages", () => {
    it("should combine text from multiple images", async () => {
      const { performOCROnImages } = await import(
        "@/lib/services/document/ocr.service"
      );

      const images = [
        Buffer.from("page 1"),
        Buffer.from("page 2"),
        Buffer.from("page 3"),
      ];

      const result = await performOCROnImages(images);

      expect(result.success).toBe(true);
      expect(result.text).toContain("Page Break");
    });

    it("should report progress during processing", async () => {
      const { performOCROnImages } = await import(
        "@/lib/services/document/ocr.service"
      );

      const progressUpdates: { status: string; progress: number }[] = [];
      const onProgress = (p: { status: string; progress: number }) => {
        progressUpdates.push(p);
      };

      const images = [Buffer.from("page 1"), Buffer.from("page 2")];

      await performOCROnImages(images, onProgress);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].status).toContain("Processing");
    });
  });

  describe("performOCROnPDF", () => {
    it("should attempt to convert PDF pages to images", async () => {
      const { performOCROnPDF } = await import(
        "@/lib/services/document/ocr.service"
      );

      const pdfBuffer = Buffer.from("fake pdf content");
      const result = await performOCROnPDF(pdfBuffer, 2);

      // Without poppler, this should fail gracefully
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
      // The error should mention poppler since it's not available
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("should report progress callback", async () => {
      const { performOCROnPDF } = await import(
        "@/lib/services/document/ocr.service"
      );

      const progressUpdates: string[] = [];
      const pdfBuffer = Buffer.from("fake pdf");

      await performOCROnPDF(pdfBuffer, 5, (p) => {
        progressUpdates.push(p.status);
      });

      // Should have at least one progress update
      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it("should handle PDF parsing errors", async () => {
      const pdf = await import("pdf-parse");
      const { performOCROnPDF } = await import(
        "@/lib/services/document/ocr.service"
      );

      vi.mocked(pdf.default).mockRejectedValueOnce(new Error("Corrupted PDF"));

      const pdfBuffer = Buffer.from("corrupted pdf");
      const result = await performOCROnPDF(pdfBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Corrupted PDF");
    });
  });

  describe("terminateOCRWorker", () => {
    it("should cleanup the Tesseract worker", async () => {
      const { terminateOCRWorker, performOCROnImage } = await import(
        "@/lib/services/document/ocr.service"
      );

      // First, create a worker by performing OCR
      await performOCROnImage(Buffer.from("test"));

      // Then terminate it
      await expect(terminateOCRWorker()).resolves.not.toThrow();
    });
  });
});
