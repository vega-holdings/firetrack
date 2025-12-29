/**
 * Services Layer
 * Business logic and orchestration
 */

// Bill Service
export { BillService, billService } from "./bill.service";
export type { ServiceResult } from "./bill.service";

// Sync Service
export { SyncService, syncService } from "./sync.service";
export type { SyncStats } from "./sync.service";

// Document Processing Services
export {
  extractTextFromPDFUrl,
  processDocumentLinks,
  extractBillText,
  performOCROnImage,
  performOCROnImages,
  performOCROnPDF,
  terminateOCRWorker,
} from "./document";
export type {
  PDFExtractionResult,
  DocumentLink,
  OCRResult,
  OCRProgress,
} from "./document";
