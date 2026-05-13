import { describe, it, expect } from 'vitest';
import { createTestDocx, paragraph, readTextFromDocx } from './test-utils.js';
import { extractPlaceholders, fillDocument } from './docxService.js';

describe('extractPlaceholders', () => {
  it('extracts placeholders from a .docx buffer', () => {
    const docx = createTestDocx(
      paragraph('{{moral_honor_details}}') +
      paragraph('{{moral_subtotal}}')
    );

    const result = extractPlaceholders(docx);

    expect(result).toEqual(['moral_honor_details', 'moral_subtotal']);
  });

  it('returns empty array when no placeholders exist', () => {
    const docx = createTestDocx(
      paragraph('一些普通文本')
    );

    const result = extractPlaceholders(docx);

    expect(result).toEqual([]);
  });
});

describe('fillDocument', () => {
  it('replaces a single placeholder with short text', () => {
    const docx = createTestDocx(
      paragraph('{{moral_subtotal}}')
    );

    const result = fillDocument(docx, { moral_subtotal: '85.5' });
    const text = readTextFromDocx(result);

    expect(text).toContain('85.5');
    expect(text).not.toContain('{{moral_subtotal}}');
  });

  it('replaces multiple placeholders simultaneously', () => {
    const docx = createTestDocx(
      paragraph('{{moral_honor_details}} 和 {{moral_subtotal}}')
    );

    const result = fillDocument(docx, {
      moral_honor_details: '三好学生 +5分',
      moral_subtotal: '92.0',
    });
    const text = readTextFromDocx(result);

    expect(text).toContain('三好学生 +5分');
    expect(text).toContain('92.0');
    expect(text).not.toContain('{{moral_honor_details}}');
    expect(text).not.toContain('{{moral_subtotal}}');
  });

  it('leaves document unchanged when fill data does not match', () => {
    const docx = createTestDocx(
      paragraph('{{existing_placeholder}}')
    );

    const result = fillDocument(docx, { non_existent: 'value' });
    const text = readTextFromDocx(result);

    expect(text).toContain('{{existing_placeholder}}');
  });

  it('replaces placeholder with multi-line text', () => {
    const docx = createTestDocx(
      paragraph('{{details}}')
    );
    const multiLine = '三好学生 +5分\n优秀班干部 +4分';

    const result = fillDocument(docx, { details: multiLine });
    const text = readTextFromDocx(result);

    expect(text).toContain('三好学生 +5分');
    expect(text).toContain('优秀班干部 +4分');
  });
});
