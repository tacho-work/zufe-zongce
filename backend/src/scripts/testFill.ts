/**
 * Generate a test filled document to verify visually.
 * Usage: npx tsx src/scripts/testFill.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fillDocument } from '../services/docxService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, '../../../附件2：浙江财经大学本科学生综合测评登记表.docx');
const OUTPUT_PATH = resolve(__dirname, '../../../test-filled-output.docx');

const fillData: Record<string, string> = {
  // 德育
  moral_honor_details: '1. 三好学生\n2. 优秀学生干部',
  moral_honor_scores: '+5\n+4',
  moral_competition_details: '校级演讲比赛一等奖',
  moral_competition_scores: '+3',
  moral_activity_details: '参与社区志愿服务20小时',
  moral_activity_scores: '+2',
  moral_other_details: '',
  moral_other_scores: '',
  moral_subtotal: '84.0',
  // 智育
  academic_formula_result: '∑(微积分95×5 + 英语92×4 + 思政88×3) ÷ 12 = 92.0',
  academic_base_scores: '92.0',
  academic_competition_details: '全国大学生数学竞赛省级一等奖',
  academic_competition_scores: '+10',
  academic_exam_details: '大学英语四级 通过',
  academic_exam_scores: '+2',
  academic_certificate_details: '计算机二级证书',
  academic_certificate_scores: '+1',
  academic_research_details: '',
  academic_research_scores: '',
  academic_other_details: '',
  academic_other_scores: '',
  academic_subtotal: '92.0',
  // 体育
  sports_score_details: '体测成绩 85分',
  sports_base_scores: '85.0',
  sports_competition_details: '校运会100米金牌',
  sports_competition_scores: '+6',
  sports_other_details: '',
  sports_other_scores: '',
  sports_subtotal: '91.0',
  // 美育
  aesthetic_activity_details: '参加校合唱团演出',
  aesthetic_activity_scores: '+2',
  aesthetic_competition_details: '校园歌手大赛二等奖',
  aesthetic_competition_scores: '+4',
  aesthetic_publication_details: '',
  aesthetic_publication_scores: '',
  aesthetic_other_details: '',
  aesthetic_other_scores: '',
  aesthetic_subtotal: '76.0',
  // 劳育
  labor_dormitory_details: '文明寝室',
  labor_dormitory_scores: '+2',
  labor_activity_details: '参与校园绿化活动',
  labor_activity_scores: '+1',
  labor_entrepreneurship_details: '',
  labor_entrepreneurship_scores: '',
  labor_project_details: '',
  labor_project_scores: '',
  labor_other_details: '',
  labor_other_scores: '',
  labor_subtotal: '73.0',
  // 其他
  other_cadre_details: '班长任职',
  other_cadre_scores: '+3',
  other_volunteer_details: '杭州亚运会志愿者',
  other_volunteer_scores: '+5',
  other_other_details: '',
  other_other_scores: '',
  other_subtotal: '78.0',
  // 总分
  total_score: '494.0',
};

const template = readFileSync(TEMPLATE_PATH);
const filled = fillDocument(template, fillData);
writeFileSync(OUTPUT_PATH, filled);
console.log(`Test filled document saved to: ${OUTPUT_PATH}`);
