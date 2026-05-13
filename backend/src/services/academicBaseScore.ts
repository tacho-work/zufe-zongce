import XLSX from "xlsx";

// ---- Types ----

export interface AcademicCourse {
  courseName: string;
  credit: number;
  rawScore: string | number;
  convertedScore: number;
  weightedScore: number;
}

export interface AcademicSemesterGroup {
  semester: string;
  courses: AcademicCourse[];
}

export interface AcademicBaseScoreResult {
  subjectId: "academic" | "sports";
  fileName: string;
  courseCount: number;
  totalCredits: number;
  totalWeightedScore: number;
  baseScore: number;
  formulaText: string;
  semesters: AcademicSemesterGroup[];
  warnings: string[];
}

const COLUMN_ALIASES: Record<string, string[]> = {
  courseName: ["课程名称", "课程名", "course name", "coursename", "课程"],
  semester: ["学期", "semester", "学年学期"],
  credit: ["学分", "credit", "credits"],
  scoreType: ["成绩分项", "成绩性质", "成绩类型", "考核类型", "score type", "scoretype"],
  score: ["成绩", "score", "分数"],
  college: ["开课学院", "学院", "college", "department"],
};

const SPORTS_COLLEGE_KEYWORDS = ["体育部", "体育"];

export const GRADE_MAP: Record<string, number> = {
  优: 95, 优秀: 95,
  良: 85, 良好: 85,
  中: 75, 中等: 75,
  及格: 65,
  不及格: 40, 不合格: 40,
};

// ---- Helpers ----

function findColumn(
  headers: string[],
  aliases: string[],
): number {
  for (const alias of aliases) {
    const idx = headers.findIndex(
      (h) => h != null && h.trim().replace(/\s+/g, "") === alias.replace(/\s+/g, ""),
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseSemesterOrder(semester: string): number {
  const s = semester.trim();

  // "第一学期", "第二学期", ...
  const cnMatch = s.match(/第\s*([一二三四五六七八九十]+)\s*学\s*期/);
  if (cnMatch) {
    const cnDigits: Record<string, number> = {
      一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
      六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
    };
    let num = 0;
    for (const ch of cnMatch[1]) num = num * 10 + (cnDigits[ch] ?? 0);
    return num;
  }

  // "第1学期", "第 2 学期", ...
  const numCnMatch = s.match(/第\s*(\d+)\s*学\s*期/);
  if (numCnMatch) return parseInt(numCnMatch[1], 10);

  // "2024-2025-1", "2025-2026-2" — extract trailing number
  const academicMatch = s.match(/(\d{4}[-/]\d{4}[-/])(\d+)/);
  if (academicMatch) return parseInt(academicMatch[2], 10);

  // Plain number
  const plainNum = s.match(/^\d+$/);
  if (plainNum) return parseInt(s, 10);

  return NaN;
}

export function convertScore(raw: string | number): number | null {
  if (raw == null || raw === "") return null;
  const str = String(raw).trim();

  // Direct number
  const num = Number(str);
  if (!isNaN(num) && str !== "") return num;

  // Five-level grade — sort by key length descending so
  // longer strings (e.g. 不及格) match before substrings (及格).
  const sortedEntries = Object.entries(GRADE_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [key, val] of sortedEntries) {
    if (str.includes(key)) return val;
  }

  return null;
}

function buildFormulaText(semesters: AcademicSemesterGroup[]): string {
  const courseTerms: string[] = [];
  let totalWeighted = 0;
  let totalCredit = 0;

  for (const sem of semesters) {
    for (const c of sem.courses) {
      courseTerms.push(`${c.courseName}${c.convertedScore}×${c.credit}`);
      totalWeighted += c.weightedScore;
      totalCredit += c.credit;
    }
  }

  const baseScore = totalCredit > 0
    ? Math.round((totalWeighted / totalCredit) * 100) / 100
    : 0;
  return `∑（${courseTerms.join("+")}）÷${totalCredit}=${baseScore.toFixed(2)}分`;
}

// ---- Main parse function ----

export function calculateAcademicBaseScore(
  buffer: Buffer,
  fileName: string,
  subjectId: "academic" | "sports" = "academic",
): AcademicBaseScoreResult {
  const workbook = XLSX.read(buffer, { type: "buffer", codepage: 65001 });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw Object.assign(new Error("No sheet found in workbook"), { statusCode: 422 });
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  if (rows.length < 2) {
    throw Object.assign(new Error("Excel has no data rows"), { statusCode: 422 });
  }

  const headers = (rows[0] as unknown[]).map((h) => String(h ?? ""));

  const colIdx = {
    courseName: findColumn(headers, COLUMN_ALIASES.courseName),
    semester: findColumn(headers, COLUMN_ALIASES.semester),
    credit: findColumn(headers, COLUMN_ALIASES.credit),
    scoreType: findColumn(headers, COLUMN_ALIASES.scoreType),
    score: findColumn(headers, COLUMN_ALIASES.score),
    college: findColumn(headers, COLUMN_ALIASES.college),
  };

  const missingCols: string[] = [];
  for (const [key, idx] of Object.entries(colIdx)) {
    if (key === "college") continue; // optional column
    if (idx === -1) missingCols.push(key);
  }
  if (missingCols.length > 0) {
    throw Object.assign(
      new Error(`Missing required columns: ${missingCols.join(", ")}`),
      { statusCode: 422 },
    );
  }

  const warnings: string[] = [];
  const allCourses: Array<{
    semester: string;
    courseName: string;
    credit: number;
    rawScore: string | number;
    convertedScore: number;
  }> = [];

  // Also track raw semester value for ordering
  const semesterRawOrder: Map<string, number> = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const scoreType = String(row[colIdx.scoreType] ?? "").trim();
    if (scoreType !== "总评") continue;

    const courseName = String(row[colIdx.courseName] ?? "").trim();
    if (!courseName) continue;

    // 智育只计算非体育部课程；体育只计算体育部课程。
    if (colIdx.college !== -1) {
      const college = String(row[colIdx.college] ?? "").trim();
      const isSportsCourse = SPORTS_COLLEGE_KEYWORDS.some((kw) => college.includes(kw));
      if (subjectId === "academic" && isSportsCourse) {
        warnings.push(`"${courseName}" 开课学院为「${college}」，不属于智育，已跳过`);
        continue;
      }
      if (subjectId === "sports" && !isSportsCourse) {
        warnings.push(`"${courseName}" 开课学院为「${college}」，不属于体育，已跳过`);
        continue;
      }
    } else if (subjectId === "sports") {
      // 没有学院列时，假定所有课程都是体育课程
    }

    const creditRaw = String(row[colIdx.credit] ?? "").trim();
    const credit = parseFloat(creditRaw);
    if (isNaN(credit)) continue;

    const rawScore = row[colIdx.score] as string | number | null | undefined;
    if (rawScore == null || String(rawScore).trim() === "") continue;

    const convertedScore = convertScore(rawScore);
    if (convertedScore === null) {
      warnings.push(`Row ${i + 1}: Unrecognized score "${rawScore}" for course "${courseName}" — skipped`);
      continue;
    }

    const semester = String(row[colIdx.semester] ?? "").trim();
    if (!semesterRawOrder.has(semester)) {
      semesterRawOrder.set(semester, semesterRawOrder.size);
    }

    allCourses.push({
      semester,
      courseName,
      credit,
      rawScore: String(rawScore),
      convertedScore,
    });
  }

  if (allCourses.length === 0) {
    const message = subjectId === "sports"
      ? "No valid 体育部 总评 rows found"
      : "No valid 非体育部 总评 rows found";
    throw Object.assign(new Error(message), { statusCode: 422 });
  }

  // Sort by semester
  const withOrder = allCourses.map((c) => ({
    ...c,
    order: parseSemesterOrder(c.semester),
    rawOrder: semesterRawOrder.get(c.semester) ?? 999,
  }));

  withOrder.sort((a, b) => {
    const aNum = isNaN(a.order) ? Infinity : a.order;
    const bNum = isNaN(b.order) ? Infinity : b.order;
    if (aNum !== bNum) return aNum - bNum;
    return a.rawOrder - b.rawOrder;
  });

  // Group by semester
  const semesterMap = new Map<string, AcademicCourse[]>();
  for (const c of withOrder) {
    let label = c.semester;
    if (!isNaN(c.order)) {
      label = `第${c.order}学期`;
    }
    if (!semesterMap.has(label)) semesterMap.set(label, []);
    semesterMap.get(label)!.push({
      courseName: c.courseName,
      credit: c.credit,
      rawScore: c.rawScore,
      convertedScore: c.convertedScore,
      weightedScore: Math.round(c.convertedScore * c.credit * 100) / 100,
    });
  }

  const semesters: AcademicSemesterGroup[] = [];
  for (const [sem, courses] of semesterMap) {
    semesters.push({ semester: sem, courses });
  }

  let totalCredits = 0;
  let totalWeightedScore = 0;
  for (const c of allCourses) {
    totalCredits += c.credit;
    totalWeightedScore += Math.round(c.convertedScore * c.credit * 100) / 100;
  }

  totalCredits = Math.round(totalCredits * 100) / 100;

  if (totalCredits === 0) {
    throw Object.assign(new Error("Total credits is zero"), { statusCode: 422 });
  }

  const baseScore = Math.round((totalWeightedScore / totalCredits) * 100) / 100;
  const formulaText = buildFormulaText(semesters);

  return {
    subjectId,
    fileName,
    courseCount: allCourses.length,
    totalCredits,
    totalWeightedScore: Math.round(totalWeightedScore * 100) / 100,
    baseScore,
    formulaText,
    semesters,
    warnings,
  };
}
