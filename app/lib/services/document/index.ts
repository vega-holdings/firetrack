/**
 * Document Processing Services
 * PDF extraction and OCR capabilities
 */

export {
  extractTextFromPDFUrl,
  processDocumentLinks,
  extractBillText,
  type PDFExtractionResult,
  type DocumentLink,
} from "./pdf.service";

export {
  performOCROnImage,
  performOCROnImages,
  performOCROnPDF,
  convertPDFPageToImage,
  terminateOCRWorker,
  type OCRResult,
  type OCRProgress,
} from "./ocr.service";
