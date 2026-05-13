import { convertScore, GRADE_MAP } from "./src/services/academicBaseScore.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

function assertEq<T>(actual: T, expected: T, label: string) {
  const ok = actual === expected;
  if (ok) { passed++; console.log(`  PASS: ${label} (${actual})`); }
  else { failed++; console.error(`  FAIL: ${label} — expected ${expected}, got ${actual}`); }
}

// ============================================================
// 1. Five-level grade conversion
// ============================================================
console.log("\n--- 1. Five-level grade conversion ---");

assertEq(convertScore("优"), 95, "优 → 95");
assertEq(convertScore("优秀"), 95, "优秀 → 95");
assertEq(convertScore("良"), 85, "良 → 85");
assertEq(convertScore("良好"), 85, "良好 → 85");
assertEq(convertScore("中"), 75, "中 → 75");
assertEq(convertScore("中等"), 75, "中等 → 75");
assertEq(convertScore("及格"), 65, "及格 → 65");
assertEq(convertScore("不及格"), 40, "不及格 → 40 (NOT 65!)");
assertEq(convertScore("不合格"), 40, "不合格 → 40");

// 2. Digital scores
console.log("\n--- 2. Digital scores ---");
assertEq(convertScore(95), 95, "95 → 95");
assertEq(convertScore("89"), 89, "'89' → 89");
assertEq(convertScore(0), 0, "0 → 0");
assertEq(convertScore("0"), 0, "'0' → 0");

// 3. Edge cases
console.log("\n--- 3. Edge cases ---");
assertEq(convertScore(""), null, "empty string → null");
assertEq(convertScore("abc"), null, "unrecognized text → null");

// ============================================================
// 4. Weighted average formula
// ============================================================
console.log("\n--- 4. Weighted average calculation ---");
// Simulate: 不及格(40)×2 + 及格(65)×1 + 优秀(95)×3
const courses = [
  { score: 40, credit: 2 },
  { score: 65, credit: 1 },
  { score: 95, credit: 3 },
];
const totalWeighted = courses.reduce((sum, c) => sum + c.score * c.credit, 0);
const totalCredits = courses.reduce((sum, c) => sum + c.credit, 0);
const baseScore = Math.round((totalWeighted / totalCredits) * 100) / 100;
assertEq(totalWeighted, 430, "totalWeighted = 40×2 + 65×1 + 95×3 = 430");
assertEq(totalCredits, 6, "totalCredits = 6");
assertEq(baseScore, 71.67, "baseScore = 430/6 = 71.67");

// ============================================================
// 5. convertScore sorts by key length — 不及格 MUST NOT be shadowed by 及格
// ============================================================
console.log("\n--- 5. 不及格 vs 及格 ordering in convertScore ---");
const sorted = Object.entries(GRADE_MAP).sort((a, b) => b[0].length - a[0].length);
const sortedKeys = sorted.map(([k]) => k);
const jiGeIdx = sortedKeys.indexOf("及格");
const buJiGeIdx = sortedKeys.indexOf("不及格");
assert(buJiGeIdx < jiGeIdx, "不及格 (len 3) appears before 及格 (len 2) in sorted order");

// ============================================================
// 6. Parse semester order
// ============================================================
console.log("\n--- 6. Semester ordering ---");
import { parseSemesterOrder } from "./src/services/academicBaseScore.js";
assertEq(parseSemesterOrder("1"), 1, "'1' → 1");
assertEq(parseSemesterOrder("2"), 2, "'2' → 2");
assertEq(parseSemesterOrder("3"), 3, "'3' → 3");
const orderNames = ["3", "1", "2"].sort((a, b) => {
  const ao = parseSemesterOrder(a);
  const bo = parseSemesterOrder(b);
  return (isNaN(ao) ? Infinity : ao) - (isNaN(bo) ? Infinity : bo);
});
assertEq(orderNames.join(","), "1,2,3", "semester sort: ['3','1','2'] → ['1','2','3']");

// ============================================================
// 7. Sports-college exclusion (智育不计入体育)
// ============================================================
console.log("\n--- 7. Sports college exclusion ---");
import XLSX from "xlsx";
import { calculateAcademicBaseScore } from "./src/services/academicBaseScore.js";

const testData = [
  ["课程名称", "学期", "学分", "成绩分项", "成绩", "开课学院"],
  ["高等数学", "1", "4", "总评", "85", "数学学院"],
  ["公共体育（1）", "1", "1", "总评", "79", "体育部"],
  ["大学英语", "1", "2", "总评", "90", "外语学院"],
  ["公共体育（2）", "2", "1", "总评", "82", "体育教学部"],
  ["程序设计", "2", "3", "总评", "88", "信息学院"],
];
const testWs = XLSX.utils.aoa_to_sheet(testData);
const testWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(testWb, testWs, "sheet1");
const testBuf = XLSX.write(testWb, { type: "buffer", bookType: "xlsx" }) as Buffer;
const testResult = calculateAcademicBaseScore(testBuf, "test.xlsx");
assertEq(testResult.courseCount, 3, "3 courses after excluding 2 sports");
assert(testResult.warnings.some((w) => w.includes("公共体育（1）")), "warning for 公共体育（1）");
assert(testResult.warnings.some((w) => w.includes("公共体育（2）")), "warning for 公共体育（2）");
// Verify calculation: (85×4 + 90×2 + 88×3) / (4+2+3) = 784/9 = 87.11
assertEq(testResult.totalCredits, 9, "total credits = 9 (excl sports)");
assertEq(testResult.baseScore, 87.11, "baseScore = 784/9 = 87.11");

// ============================================================
// 8. Real Excel calculation (via buffer) — skipped if file absent
// ============================================================
console.log("\n--- 8. Real Excel result ---");
import * as fs from "fs";
const testPath = "/Users/tacho/Desktop/综测/文件1778315225658.xlsx";
if (fs.existsSync(testPath)) {
  const buf = fs.readFileSync(testPath);
  const real = calculateAcademicBaseScore(buf, "文件1778315225658.xlsx");
  console.log(`  courses=${real.courseCount} credits=${real.totalCredits} weighted=${real.totalWeightedScore} base=${real.baseScore}`);
  console.log(`  formula: ${real.formulaText}`);
} else {
  console.log("  SKIP — test file not found (flow is now upload-based)");
}

// ============================================================
// Summary
// ============================================================
console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
