import { readFileSync, writeFileSync } from 'fs';
import PizZip from 'pizzip';
import { queryOne } from '../db/connection.js';

const EXTRACTION_PROMPT = `你是一个Word文档模板分析专家。你的任务是为一份"综合测评登记表"的空白Word模板（.docx）分析其表格结构，并在正确的位置插入 \`{{占位符}}\`。

## 占位符命名规则

占位符名格式: \`{{subject_category_type}}\`

- \`_details\`: 放在"记实内容情况"列
- \`_scores\`: 放在"加（减）分"列
- \`_subtotal\`: 放在小计行的"加（减）分"列，不填记实内容
- 特殊行单独命名（如 \`formula_result\`, \`base_scores\`, \`score_details\`）

## 占位符完整列表（共57个）

德育（9个）:
- moral_honor_details, moral_honor_scores
- moral_competition_details, moral_competition_scores
- moral_activity_details, moral_activity_scores
- moral_other_details, moral_other_scores
- moral_subtotal

智育（13个）:
- academic_formula_result, academic_base_scores
- academic_competition_details, academic_competition_scores
- academic_exam_details, academic_exam_scores
- academic_certificate_details, academic_certificate_scores
- academic_research_details, academic_research_scores
- academic_other_details, academic_other_scores
- academic_subtotal

体育（7个）:
- sports_score_details, sports_base_scores
- sports_competition_details, sports_competition_scores
- sports_other_details, sports_other_scores
- sports_subtotal

美育（9个）:
- aesthetic_activity_details, aesthetic_activity_scores
- aesthetic_competition_details, aesthetic_competition_scores
- aesthetic_publication_details, aesthetic_publication_scores
- aesthetic_other_details, aesthetic_other_scores
- aesthetic_subtotal

劳育（11个）:
- labor_dormitory_details, labor_dormitory_scores
- labor_activity_details, labor_activity_scores
- labor_entrepreneurship_details, labor_entrepreneurship_scores
- labor_project_details, labor_project_scores
- labor_other_details, labor_other_scores
- labor_subtotal

其他（7个）:
- other_cadre_details, other_cadre_scores
- other_volunteer_details, other_volunteer_scores
- other_other_details, other_other_scores
- other_subtotal

总分（1个）:
- total_score

## 插入规则

模板为单一表格，共41行。列对应关系:
- Cell 0: 行标签列（科目名，如"德育""智育"）
- Cell 1: 类别名称列（如"荣誉奖励情况"），total_score经此列
- Cell 2: **记实内容情况列** → 放 \`_details\` 占位符
- Cell 3: **加（减）分列** → 放 \`_scores\` / \`_subtotal\` / \`_base_scores\` 占位符

每科目的结构完全一致，按 德育→智育→体育→美育→劳育→其他 顺序排列。

示例—德育组：
- 荣誉奖励情况行: Cell2=\`{{moral_honor_details}}\`, Cell3=\`{{moral_honor_scores}}\`
- 德育比赛情况行: Cell2=\`{{moral_competition_details}}\`, Cell3=\`{{moral_competition_scores}}\`
- 参加活动情况行: Cell2=\`{{moral_activity_details}}\`, Cell3=\`{{moral_activity_scores}}\`
- 其它加减分情况行: Cell2=\`{{moral_other_details}}\`, Cell3=\`{{moral_other_scores}}\`
- 小计行: Cell3=\`{{moral_subtotal}}\`（Cell2留空）

## 输出格式

只输出修改后的完整 \`word/document.xml\` 内容，不需要任何解释。确保每个占位符在 \`<w:t>\` 标签内完整写入。`;

function getAIToken(): string {
  return process.env.AI_TOKEN || process.env.AI_API_KEY
    || (queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'ai_token'")?.value)
    || '';
}

function getAISettings() {
  const provider = (queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'ai_provider'")?.value) ?? '';
  const baseUrl = (queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'ai_base_url'")?.value) ?? '';
  const model = (queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'ai_model'")?.value) ?? '';
  return { provider, baseUrl, model };
}

interface PlaceholderPosition {
  row: number;
  cell: number;
  name: string;
}

/**
 * Extract the template's table structure as readable text for the AI prompt.
 */
function extractTableStructure(docXml: string): string {
  const tbl = docXml.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/);
  if (!tbl) return 'No table found';
  const rows = tbl[0].match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
  const lines: string[] = [];
  rows.forEach((row: string, ri: number) => {
    const cells = row.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
    const cellTexts = cells.map((c: string) => {
      const texts = [...c.matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/gs)];
      return texts.map(t => t[1]).join('').trim().substring(0, 40);
    });
    lines.push(`Row ${ri}: [${cellTexts.map((t, i) => `Cell${i}="${t}"`).join(', ')}]`);
  });
  return lines.join('\n');
}

/**
 * Apply placeholder insertions to the document XML.
 * For each {row, cell, name}, we insert {{name}} into the first <w:t> of that cell.
 */
function applyPlaceholders(docXml: string, positions: PlaceholderPosition[]): string {
  const tbl = docXml.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/);
  if (!tbl) return docXml;

  let tableXml = tbl[0];

  // Find exact start/end index of each row, so we never .replace() the wrong one
  const rowRegex = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  const rowOffsets: { start: number; end: number; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(tableXml)) !== null) {
    rowOffsets.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }

  // Sort positions by row descending so we edit from bottom up (offsets stay valid)
  const sorted = [...positions]
    .filter((p) => p.row >= 0 && p.row < rowOffsets.length)
    .sort((a, b) => b.row - a.row || b.cell - a.cell);

  for (const pos of sorted) {
    const { start: rowStart, end: rowEnd } = rowOffsets[pos.row];
    const rowText = tableXml.substring(rowStart, rowEnd);

    // Find cells within this row by offset
    const cellRegex = /<w:tc\b[\s\S]*?<\/w:tc>/g;
    const cellOffsets: { start: number; end: number }[] = [];
    let cm: RegExpExecArray | null;
    while ((cm = cellRegex.exec(rowText)) !== null) {
      cellOffsets.push({ start: cm.index, end: cm.index + cm[0].length });
    }

    if (pos.cell < 0 || pos.cell >= cellOffsets.length) continue;
    const { start: cellStart, end: cellEnd } = cellOffsets[pos.cell];
    const cellText = rowText.substring(cellStart, cellEnd);

    // Find first <w:t> inside this cell (use \b to avoid matching <w:tc>, <w:tr>, etc.)
    const wtMatch = cellText.match(/<w:t\b[^>]*>/);
    const placeholder = `{{${pos.name}}}`;

    let modifiedCell: string;
    if (wtMatch) {
      const wtTag = wtMatch[0];
      const wtIdx = cellText.indexOf(wtTag);
      modifiedCell = cellText.substring(0, wtIdx + wtTag.length) + placeholder + cellText.substring(wtIdx + wtTag.length);
    } else {
      // No <w:t> exists — create a new paragraph with the placeholder before </w:tc>
      const endIdx = cellText.lastIndexOf('</w:tc>');
      modifiedCell = cellText.substring(0, endIdx) + `<w:p><w:r><w:t>${placeholder}</w:t></w:r></w:p>` + cellText.substring(endIdx);
    }
    const modifiedRow = rowText.substring(0, cellStart) + modifiedCell + rowText.substring(cellEnd);

    // Replace row at its exact offset and update rowEnd for same-row positions
    const originalRowLen = rowText.length;
    tableXml = tableXml.substring(0, rowStart) + modifiedRow + tableXml.substring(rowEnd);
    rowOffsets[pos.row].end = rowStart + modifiedRow.length;
  }

  return docXml.replace(tbl[0], tableXml);
}

/**
 * Call the AI API to analyze the template and get placeholder positions.
 */
async function callAIForPlaceholders(
  tableStructure: string,
): Promise<PlaceholderPosition[]> {
  const { provider, baseUrl, model } = getAISettings();
  const token = getAIToken();

  if (!token) throw new Error('AI Token 未配置，请在设置页输入 API Key');
  if (!baseUrl) throw new Error('AI API Base URL 未配置');
  if (!model) throw new Error('AI Model 未配置');

  const userMessage = `请分析以下模板表格结构，输出每个占位符应该插入的行号和列号。\n\n模板结构：\n\`\`\`\n${tableStructure}\n\`\`\`\n\n以JSON数组格式输出，每个元素包含 row, cell, name 三个字段。只输出JSON，不要其他内容。`;

  const isAnthropic = provider === 'anthropic' || baseUrl.includes('/anthropic');

  let response: Response;

  if (isAnthropic) {
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/messages`;
    console.log(`[templateAI] Calling endpoint: ${endpoint}, model: ${model}`);
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': token,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 16384,
          system: EXTRACTION_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.1,
        }),
      });
    } catch (fetchErr) {
      const e = fetchErr as Error;
      console.error(`[templateAI] Fetch failed: ${e.message}`, e.cause);
      throw new Error(`AI API 调用失败: ${e.message}`);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`AI API 错误 ${response.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await response.json();
    // Anthropic API returns content array with thinking+text blocks — try both
    const textBlock = data.content?.find((c: { type: string }) => c.type === 'text');
    const thinkingBlock = data.content?.find((c: { type: string }) => c.type === 'thinking');
    let content = textBlock?.text || thinkingBlock?.thinking;
    if (!content) {
      const preview = JSON.stringify(data).substring(0, 500);
      throw new Error(`AI 返回内容为空。原始响应: ${preview}`);
    }

    // Extract JSON array from response
    const jsonMatch = content.match(/\[\s*\{[^]*?\}\s*\]/);
    if (!jsonMatch) throw new Error(`AI 返回格式错误，未找到JSON数组: ${content.substring(0, 200)}`);

    const positions: PlaceholderPosition[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(positions) || positions.length === 0) {
      throw new Error('AI 返回的占位符列表为空');
    }
    for (const p of positions) {
      if (typeof p.row !== 'number' || typeof p.cell !== 'number' || typeof p.name !== 'string') {
        throw new Error(`AI 返回格式错误: ${JSON.stringify(p)}`);
      }
    }

    return positions;
  } else {
    // OpenAI-compatible
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`AI API 错误 ${response.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 返回内容为空');

    const jsonMatch = content.match(/\[\s*\{[^]*?\}\s*\]/);
    if (!jsonMatch) throw new Error(`AI 返回格式错误，未找到JSON数组: ${content.substring(0, 200)}`);

    const positions: PlaceholderPosition[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(positions) || positions.length === 0) {
      throw new Error('AI 返回的占位符列表为空');
    }
    for (const p of positions) {
      if (typeof p.row !== 'number' || typeof p.cell !== 'number' || typeof p.name !== 'string') {
        throw new Error(`AI 返回格式错误: ${JSON.stringify(p)}`);
      }
    }

    return positions;
  }
}

/**
 * Process a blank template through AI: extract structure, call AI, insert placeholders.
 * Returns the path to the modified template file.
 */
export async function processTemplateWithAI(templatePath: string): Promise<string> {
  const zip = new PizZip(readFileSync(templatePath));
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('模板文件中未找到 word/document.xml');
  const docXml = docFile.asText();

  // Step 1: Extract table structure
  const structure = extractTableStructure(docXml);

  // Step 2: Call AI to get placeholder positions
  const positions = await callAIForPlaceholders(structure);

  // Step 3: Apply placeholders to XML
  const modifiedXml = applyPlaceholders(docXml, positions);

  // Step 4: Save modified template
  zip.file('word/document.xml', modifiedXml);
  const outputPath = templatePath.replace(/\.docx$/, '_ai_recognized.docx');
  writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));


  console.log(`[templateAI] AI processing complete: ${positions.length} placeholders inserted`);
  return outputPath;
}
