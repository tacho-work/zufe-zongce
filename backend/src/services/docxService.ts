import PizZip from 'pizzip';

const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

/**
 * Extract all placeholder names from a .docx buffer.
 * Returns placeholder strings without the {{}} delimiters.
 */
export function extractPlaceholders(docxBuffer: Buffer): string[] {
  const zip = new PizZip(docxBuffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) return [];

  const placeholders: string[] = [];
  const matches = docXml.matchAll(PLACEHOLDER_RE);
  for (const match of matches) {
    placeholders.push(match[1]);
  }

  return [...new Set(placeholders)];
}

/**
 * Fill placeholders in a .docx buffer with provided data.
 * Returns a new Buffer of the filled .docx.
 */
export function fillDocument(docxBuffer: Buffer, fillData: Record<string, string>): Buffer {
  const zip = new PizZip(docxBuffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) throw new Error('无法读取文档内容');

  let result = docXml;
  for (const [key, value] of Object.entries(fillData)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, escapeXml(value));
  }

  zip.file('word/document.xml', result);
  return Buffer.from(zip.generate({ type: 'nodebuffer' }));
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
