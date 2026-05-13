import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractPlaceholders, fillDocument } from './docxService.js';
import { readTextFromDocx } from './test-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, '../../../附件2：浙江财经大学本科学生综合测评登记表.docx');

let templateBuffer: Buffer;

beforeAll(() => {
  templateBuffer = readFileSync(TEMPLATE_PATH);
});

describe('template integration', () => {
  it('extracts all 57 placeholders from the marked template', () => {
    const placeholders = extractPlaceholders(templateBuffer);

    expect(placeholders).toHaveLength(57);
    expect(placeholders).toContain('moral_honor_details');
    expect(placeholders).toContain('moral_honor_scores');
    expect(placeholders).toContain('moral_subtotal');
    expect(placeholders).toContain('academic_formula_result');
    expect(placeholders).toContain('academic_subtotal');
    expect(placeholders).toContain('sports_score_details');
    expect(placeholders).toContain('sports_subtotal');
    expect(placeholders).toContain('aesthetic_activity_details');
    expect(placeholders).toContain('aesthetic_subtotal');
    expect(placeholders).toContain('labor_dormitory_details');
    expect(placeholders).toContain('labor_subtotal');
    expect(placeholders).toContain('other_cadre_details');
    expect(placeholders).toContain('other_subtotal');
    expect(placeholders).toContain('total_score');
  });

  it('fills all placeholders and removes them from output', () => {
    const fillData: Record<string, string> = {};
    const placeholders = extractPlaceholders(templateBuffer);
    for (const ph of placeholders) {
      if (ph.endsWith('_subtotal') || ph === 'total_score') {
        fillData[ph] = '85.5';
      } else if (ph.endsWith('_scores') || ph.endsWith('_base_scores')) {
        fillData[ph] = '+5';
      } else {
        fillData[ph] = '测试内容';
      }
    }

    const result = fillDocument(templateBuffer, fillData);
    const text = readTextFromDocx(result);

    // All placeholders should be gone
    expect(text).not.toContain('{{moral_honor_details');
    expect(text).not.toContain('{{moral_subtotal');
    expect(text).not.toContain('{{total_score');

    // Filled data should be present
    expect(text).toContain('85.5');
    expect(text).toContain('测试内容');
  });
});
