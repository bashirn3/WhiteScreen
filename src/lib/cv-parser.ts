import { PDFLoader } from "langchain/document_loaders/fs/pdf";

export interface CVParseResult {
  success: boolean;
  text?: string;
  fileName?: string;
  error?: string;
}

export interface ExtractedCandidateInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Sanitize text to remove problematic Unicode characters and escape sequences
 * that can cause issues with JSON/database storage
 */
function sanitizeText(text: string): string {
  return text
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove other control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Replace problematic Unicode characters
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")
    // Replace non-breaking spaces with regular spaces
    .replace(/\u00A0/g, " ")
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Replace smart quotes with regular quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace em/en dashes with regular dashes
    .replace(/[\u2013\u2014]/g, "-")
    // Replace bullet points with asterisks
    .replace(/[\u2022\u2023\u2043]/g, "*")
    // Remove other potentially problematic Unicode
    .replace(/[\uD800-\uDFFF]/g, "") // Surrogate pairs
    // Normalize whitespace
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove excessive newlines
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/**
 * Parse a CV/Resume file and extract text content
 * Supports: PDF, TXT, DOC, DOCX
 */
export async function parseCV(file: File): Promise<CVParseResult> {
  try {
    const fileName = file.name.toLowerCase();
    let text = "";

    if (fileName.endsWith(".pdf")) {
      text = await parsePDF(file);
    } else if (fileName.endsWith(".txt")) {
      text = await parseTXT(file);
    } else if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
      text = await parseDOC(file);
    } else {
      return {
        success: false,
        error: `Unsupported file format: ${fileName}. Supported formats: PDF, TXT, DOC, DOCX`,
      };
    }

    // Sanitize the text to remove problematic characters
    const sanitizedText = sanitizeText(text);
    
    return {
      success: true,
      text: sanitizedText,
      fileName: file.name,
    };
  } catch (error) {
    console.error("Error parsing CV:", error);
    return {
      success: false,
      error: `Failed to parse file: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Parse PDF file
 */
async function parsePDF(file: File): Promise<string> {
  const loader = new PDFLoader(file);
  const docs = await loader.load();
  return docs.map((doc) => doc.pageContent).join("\n");
}

/**
 * Parse TXT file
 */
async function parseTXT(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(arrayBuffer);
  return text;
}

/**
 * Parse DOC/DOCX file using mammoth
 */
async function parseDOC(file: File): Promise<string> {
  // Dynamic import for mammoth (handles both .doc and .docx)
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Extract candidate name, email, and phone from CV text using regex patterns
 */
export function extractCandidateInfo(cvText: string): ExtractedCandidateInfo {
  // Email regex - find first email in the document
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const emailMatch = cvText.match(emailRegex);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;

  // Phone regex - various formats
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const phoneMatch = cvText.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, " ").trim() : null;

  // Name extraction - typically at the beginning of the CV
  // Look for the first line that looks like a name (capitalized words, 2-4 words)
  const lines = cvText.split("\n").filter((line) => line.trim().length > 0);
  let name: string | null = null;

  for (const line of lines.slice(0, 10)) {
    // Check first 10 lines
    const trimmedLine = line.trim();
    
    // Skip if it looks like an email, phone, address, or URL
    if (
      trimmedLine.includes("@") ||
      trimmedLine.match(/^\+?\d/) ||
      trimmedLine.toLowerCase().includes("resume") ||
      trimmedLine.toLowerCase().includes("curriculum") ||
      trimmedLine.toLowerCase().includes("cv") ||
      trimmedLine.includes("http") ||
      trimmedLine.includes("www.")
    ) {
      continue;
    }

    // Check if it looks like a name (2-4 words, mostly alphabetic)
    const words = trimmedLine.split(/\s+/);
    if (words.length >= 2 && words.length <= 5) {
      const isName = words.every((word) => {
        // Allow letters, hyphens, apostrophes, and dots (for initials)
        return /^[A-Za-z][A-Za-z'-\.]*$/.test(word) && word.length > 1;
      });
      
      if (isName) {
        // Capitalize each word properly
        name = words
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        break;
      }
    }
  }

  return { name, email, phone };
}

/**
 * Parse multiple CV files in bulk
 */
export async function parseCVsBulk(
  files: File[]
): Promise<Array<CVParseResult & { extractedInfo?: ExtractedCandidateInfo }>> {
  const results = await Promise.all(
    files.map(async (file) => {
      const parseResult = await parseCV(file);
      
      if (parseResult.success && parseResult.text) {
        const extractedInfo = extractCandidateInfo(parseResult.text);
        return { ...parseResult, extractedInfo };
      }
      
      return parseResult;
    })
  );

  return results;
}

