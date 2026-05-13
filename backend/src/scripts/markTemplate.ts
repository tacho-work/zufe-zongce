/**
 * Script: Insert placeholders into the 附件2 template.
 * Reads the .docx, finds table cells by position, inserts placeholders.
 *
 * Usage: npx tsx src/scripts/markTemplate.ts
 */
import PizZip from 'pizzip';
import * as fs from 'fs';
import * as path from 'path';

const TEMPLATE_PATH = path.resolve(import.meta.dirname, '../../../附件2：浙江财经大学本科学生综合测评登记表.docx');
const OUTPUT_PATH = path.resolve(import.meta.dirname, '../../../附件2：浙江财经大学本科学生综合测评登记表.docx');

// Row index → { details: placeholder for C2, scores: placeholder for C3 }
const PLACEHOLDER_MAP: Record<number, { details?: string; scores?: string }> = {
  // 德育
  3: { details: 'moral_honor_details', scores: 'moral_honor_scores' },
  4: { details: 'moral_competition_details', scores: 'moral_competition_scores' },
  5: { details: 'moral_activity_details', scores: 'moral_activity_scores' },
  6: { details: 'moral_other_details', scores: 'moral_other_scores' },
  7: { scores: 'moral_subtotal' },
  // 智育
  8: { details: 'academic_formula_result', scores: 'academic_base_scores' },
  9: { details: 'academic_competition_details', scores: 'academic_competition_scores' },
  10: { details: 'academic_exam_details', scores: 'academic_exam_scores' },
  11: { details: 'academic_certificate_details', scores: 'academic_certificate_scores' },
  12: { details: 'academic_research_details', scores: 'academic_research_scores' },
  13: { details: 'academic_other_details', scores: 'academic_other_scores' },
  14: { scores: 'academic_subtotal' },
  // 体育
  15: { details: 'sports_score_details', scores: 'sports_base_scores' },
  16: { details: 'sports_competition_details', scores: 'sports_competition_scores' },
  17: { details: 'sports_other_details', scores: 'sports_other_scores' },
  18: { scores: 'sports_subtotal' },
  // 美育
  20: { details: 'aesthetic_activity_details', scores: 'aesthetic_activity_scores' },
  21: { details: 'aesthetic_competition_details', scores: 'aesthetic_competition_scores' },
  22: { details: 'aesthetic_publication_details', scores: 'aesthetic_publication_scores' },
  23: { details: 'aesthetic_other_details', scores: 'aesthetic_other_scores' },
  24: { scores: 'aesthetic_subtotal' },
  // 劳育
  26: { details: 'labor_dormitory_details', scores: 'labor_dormitory_scores' },
  27: { details: 'labor_activity_details', scores: 'labor_activity_scores' },
  28: { details: 'labor_entrepreneurship_details', scores: 'labor_entrepreneurship_scores' },
  29: { details: 'labor_project_details', scores: 'labor_project_scores' },
  30: { details: 'labor_other_details', scores: 'labor_other_scores' },
  31: { scores: 'labor_subtotal' },
  // 其他
  33: { details: 'other_cadre_details', scores: 'other_cadre_scores' },
  34: { details: 'other_volunteer_details', scores: 'other_volunteer_scores' },
  35: { details: 'other_other_details', scores: 'other_other_scores' },
  36: { scores: 'other_subtotal' },
  // 总分
  37: { scores: 'total_score' },
};

function main() {
  const docxBuffer = fs.readFileSync(TEMPLATE_PATH);
  const zip = new PizZip(docxBuffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) throw new Error('Cannot read word/document.xml');

  // Parse rows by splitting on <w:tr> tags
  const rowRegex = /(<w:tr[ >].*?<\/w:tr>)/gs;
  const rows: string[] = [];
  let match;
  while ((match = rowRegex.exec(docXml)) !== null) {
    rows.push(match[1]);
  }

  let modified = false;

  const modifiedRows = rows.map((rowXml, rowIdx) => {
    const mapping = PLACEHOLDER_MAP[rowIdx];
    if (!mapping) return rowXml;

    // Split row into cells
    const cellRegex = /(<w:tc[ >].*?<\/w:tc>)/gs;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
      cells.push(cellMatch[1]);
    }

    if (cells.length < 3) return rowXml;

    let newRow = rowXml;

    // cells[0]=C0 类别, cells[1]=C1 测评项目, cells[2]=C2 记实内容情况, cells[3]=C3 加(减)分
    if (mapping.details && cells[2]) {
      const placeholder = `{{${mapping.details}}}`;
      newRow = insertPlaceholderInCell(newRow, cells[2], placeholder);
    }

    if (mapping.scores && cells[3]) {
      const placeholder = `{{${mapping.scores}}}`;
      newRow = insertPlaceholderInCell(newRow, cells[3], placeholder);
    }

    modified = true;
    return newRow;
  });

  if (!modified) {
    console.log('No placeholders were inserted - check row indices');
    return;
  }

  // Reconstruct XML by replacing each row
  let newXml = docXml;
  const allRows = [...newXml.matchAll(rowRegex)];
  for (let i = 0; i < allRows.length; i++) {
    const origRow = allRows[i][0];
    const newRowContent = modifiedRows[i];
    if (origRow !== newRowContent) {
      // Use indexOf + replace to avoid regex issues
      const idx = newXml.indexOf(origRow);
      if (idx !== -1) {
        newXml = newXml.slice(0, idx) + newRowContent + newXml.slice(idx + origRow.length);
      }
    }
  }

  // Handle total_score separately — insert into the cell after "综合测评总分"
  if (!newXml.includes('{{total_score}}')) {
    // Find the cell containing "综合测评总分" and insert total_score in the next cell
    const totalLabel = '综合测评总分';
    const labelIdx = newXml.indexOf(totalLabel);
    if (labelIdx !== -1) {
      // Find the closing </w:tc> of the label cell, then find the next <w:tc>...</w:tc>
      const afterLabel = newXml.indexOf('</w:tc>', labelIdx);
      if (afterLabel !== -1) {
        const nextTc = newXml.indexOf('<w:tc', afterLabel);
        const nextTcEnd = newXml.indexOf('</w:tc>', nextTc);
        if (nextTc !== -1 && nextTcEnd !== -1) {
          const closeTag = '</w:tc>';
          const cellEnd = nextTcEnd + closeTag.length;
          const newCell = newXml.slice(nextTc, cellEnd - closeTag.length) +
            `<w:p><w:r><w:t>{{total_score}}</w:t></w:r></w:p>` +
            closeTag;
          newXml = newXml.slice(0, nextTc) + newCell + newXml.slice(cellEnd);
        }
      }
    }
  }

  zip.file('word/document.xml', newXml);
  const outBuf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  fs.writeFileSync(OUTPUT_PATH, outBuf);

  // Report inserted placeholders
  const inserted: string[] = [];
  for (const [_, map] of Object.entries(PLACEHOLDER_MAP)) {
    if (map.details) inserted.push(map.details);
    if (map.scores) inserted.push(map.scores);
  }
  console.log(`Inserted ${inserted.length} placeholders into template`);
  console.log('Placeholders:', inserted.join(', '));

  // Verify: read back and check
  const verifyZip = new PizZip(fs.readFileSync(OUTPUT_PATH));
  const verifyXml = verifyZip.file('word/document.xml')?.asText() || '';
  const verified = [...verifyXml.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]);
  console.log(`\nVerification: ${verified.length} placeholders found in document`);
}

function insertPlaceholderInCell(rowXml: string, cellXml: string, placeholder: string): string {
  // Find the last <w:t> in the cell and insert placeholder text
  const lastTIndex = cellXml.lastIndexOf('</w:t>');
  if (lastTIndex === -1) {
    // No text run exists — create one
    const cellEnd = cellXml.lastIndexOf('</w:tc>');
    if (cellEnd === -1) return rowXml;
    const newCell = cellXml.slice(0, cellEnd) +
      `<w:p><w:r><w:t>${placeholder}</w:t></w:r></w:p>` +
      cellXml.slice(cellEnd);
    return rowXml.replace(cellXml, newCell);
  }

  // Insert placeholder text inside the last <w:t>
  const beforeText = cellXml.slice(0, lastTIndex);
  // Find the <w:t> opening tag position
  const tOpenTagEnd = beforeText.lastIndexOf('>');
  const afterText = cellXml.slice(lastTIndex);
  const newCell = beforeText.slice(0, tOpenTagEnd + 1) + placeholder + afterText;
  return rowXml.replace(cellXml, newCell);
}

main();
