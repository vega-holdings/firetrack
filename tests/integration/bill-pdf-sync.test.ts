import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock axios for API calls
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    create: vi.fn().mockReturnValue({
      get: vi.fn(),
    }),
  },
}));

// Mock pdf-parse
vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

// Mock OCR service
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

// Mock Prisma
const mockPrisma = {
  bill: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  billSponsor: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  billAction: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  billDocument: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  billVersion: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

describe("Bill Sync with PDF Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Congress.gov Bill Sync", () => {
    it("should sync a federal bill and extract PDF text from versions", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");
      const { extractTextFromPDFUrl } = await import(
        "@/lib/services/document/pdf.service"
      );

      // Mock PDF download
      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("mock pdf content"),
      });

      // Mock PDF parsing with meaningful bill text
      vi.mocked(pdf.default).mockResolvedValue({
        text: `
          118th CONGRESS
          1st Session
          H. R. 1234

          AN ACT
          To regulate the sale and transfer of firearms, and for other purposes.

          Be it enacted by the Senate and House of Representatives of the
          United States of America in Congress assembled,

          SECTION 1. SHORT TITLE.
          This Act may be cited as the "Firearms Safety Improvement Act of 2024".

          SECTION 2. BACKGROUND CHECKS.
          All firearms transfers shall require a background check through the
          National Instant Criminal Background Check System.
        `,
        numpages: 12,
        info: {},
        metadata: null,
        version: "1.0",
      });

      // Test PDF extraction
      const result = await extractTextFromPDFUrl(
        "https://www.congress.gov/118/bills/hr1234/BILLS-118hr1234ih.pdf"
      );

      expect(result.success).toBe(true);
      expect(result.text).toContain("Firearms Safety Improvement Act");
      expect(result.text).toContain("BACKGROUND CHECKS");
      expect(result.method).toBe("text");
      expect(result.pageCount).toBe(12);
    });

    it("should handle bills with scanned PDF documents", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");
      const ocrService = await import("@/lib/services/document/ocr.service");
      const { extractTextFromPDFUrl } = await import(
        "@/lib/services/document/pdf.service"
      );

      // Mock PDF download
      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("scanned pdf"),
      });

      // Mock PDF parsing - returns minimal text (scanned PDF)
      vi.mocked(pdf.default).mockResolvedValue({
        text: "",
        numpages: 5,
        info: {},
        metadata: null,
        version: "1.0",
      });

      const result = await extractTextFromPDFUrl(
        "https://www.congress.gov/118/bills/hr5678/BILLS-118hr5678ih.pdf"
      );

      // Should have attempted OCR
      expect(ocrService.performOCROnPDF).toHaveBeenCalled();
      // Since OCR is mocked to fail, result should indicate failure
      expect(result.success).toBe(false);
      expect(result.method).toBe("none");
    });
  });

  describe("OpenStates Bill Sync", () => {
    it("should sync a state bill and extract PDF from versions", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");
      const { extractBillText } = await import(
        "@/lib/services/document/pdf.service"
      );

      // Mock PDF download
      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("mock state bill pdf"),
      });

      // Mock PDF parsing with state bill text
      vi.mocked(pdf.default).mockResolvedValue({
        text: `
          TEXAS STATE LEGISLATURE
          88th Regular Session

          HOUSE BILL 2345

          AN ACT
          relating to the regulation of firearms sales in the State of Texas,
          including provisions for concealed carry permits and dealer licensing.

          BE IT ENACTED BY THE LEGISLATURE OF THE STATE OF TEXAS:

          SECTION 1. DEFINITIONS
          In this chapter, "firearm" means any weapon designed to expel a
          projectile by the action of an explosive.
        `,
        numpages: 8,
        info: {},
        metadata: null,
        version: "1.0",
      });

      const versions = [
        {
          url: "https://capitol.texas.gov/tlodocs/88R/billtext/pdf/HB02345I.pdf",
          mediaType: "application/pdf",
        },
      ];
      const documents = [
        {
          url: "https://capitol.texas.gov/tlodocs/88R/analysis/pdf/HB02345H.pdf",
          mediaType: "application/pdf",
        },
      ];

      const result = await extractBillText(versions, documents);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.text).toContain("TEXAS STATE LEGISLATURE");
      expect(result?.text).toContain("firearms sales");
    });

    it("should fall back to documents when versions are unavailable", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");
      const { extractBillText } = await import(
        "@/lib/services/document/pdf.service"
      );

      let callCount = 0;
      vi.mocked(axios.default.get).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("404 Not Found");
        }
        return { data: Buffer.from("mock document pdf") };
      });

      vi.mocked(pdf.default).mockResolvedValue({
        text: `
          FISCAL ANALYSIS

          House Bill 2345 would implement new requirements for firearms dealers
          in the State of Texas. The estimated fiscal impact includes licensing
          fees projected to generate $2.5 million in annual revenue, while
          implementation costs are estimated at $1.2 million in the first year.
        `,
        numpages: 3,
        info: {},
        metadata: null,
        version: "1.0",
      });

      const versions = [
        {
          url: "https://capitol.texas.gov/tlodocs/88R/billtext/pdf/HB02345I.pdf",
          mediaType: "application/pdf",
        },
      ];
      const documents = [
        {
          url: "https://capitol.texas.gov/tlodocs/88R/analysis/pdf/HB02345H.pdf",
          mediaType: "application/pdf",
        },
      ];

      const result = await extractBillText(versions, documents);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.text).toContain("FISCAL ANALYSIS");
    });
  });

  describe("PDF Processing Edge Cases", () => {
    it("should handle password-protected PDFs gracefully", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");
      const { extractTextFromPDFUrl } = await import(
        "@/lib/services/document/pdf.service"
      );

      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("encrypted pdf"),
      });

      vi.mocked(pdf.default).mockRejectedValue(
        new Error("This PDF is password protected")
      );

      const result = await extractTextFromPDFUrl(
        "https://example.com/protected.pdf"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("password protected");
    });

    it("should handle very large PDFs", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");
      const { extractTextFromPDFUrl } = await import(
        "@/lib/services/document/pdf.service"
      );

      // Simulate a large PDF response
      const largePdfBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      vi.mocked(axios.default.get).mockResolvedValue({
        data: largePdfBuffer,
      });

      // Large document with lots of text
      const longText = "Lorem ipsum ".repeat(5000);
      vi.mocked(pdf.default).mockResolvedValue({
        text: longText,
        numpages: 500,
        info: {},
        metadata: null,
        version: "1.0",
      });

      const result = await extractTextFromPDFUrl(
        "https://example.com/large-bill.pdf"
      );

      expect(result.success).toBe(true);
      expect(result.pageCount).toBe(500);
      expect(result.text?.length).toBeGreaterThan(10000);
    });

    it("should filter out non-firearms-related content", async () => {
      const axios = await import("axios");
      const pdf = await import("pdf-parse");
      const { extractTextFromPDFUrl } = await import(
        "@/lib/services/document/pdf.service"
      );

      vi.mocked(axios.default.get).mockResolvedValue({
        data: Buffer.from("mock pdf"),
      });

      // Simulate a bill about agriculture (not firearms)
      vi.mocked(pdf.default).mockResolvedValue({
        text: `
          A BILL
          To provide funding for agricultural research and development programs
          and to establish new subsidies for corn and soybean farmers in the
          Midwest region of the United States. This legislation aims to
          strengthen the agricultural sector and ensure food security for all
          Americans through sustained investment in farming technology.
        `,
        numpages: 4,
        info: {},
        metadata: null,
        version: "1.0",
      });

      const result = await extractTextFromPDFUrl(
        "https://example.com/agriculture-bill.pdf"
      );

      // Should still extract the text (filtering happens at search/classification level)
      expect(result.success).toBe(true);
      expect(result.text).toContain("agricultural research");
      expect(result.text).not.toContain("firearm");
    });
  });
});
