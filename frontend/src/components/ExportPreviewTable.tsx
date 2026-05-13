import type { StudentScorePreview, SubjectId } from '../types/zongce';
import { ASSESSMENT_SUBJECTS } from '../types/zongce';
import './ExportPreviewTable.css';

interface Props {
  students: StudentScorePreview[];
  onSelectStudent: (student: StudentScorePreview) => void;
  selectedStudentId?: string;
}

export function ExportPreviewTable({ students, onSelectStudent, selectedStudentId }: Props) {
  if (students.length === 0) {
    return (
      <div className="ept-empty">
        <p>暂无学生数据。请先导入学生 Excel 并执行计算。</p>
      </div>
    );
  }

  return (
    <div className="ept-scroll">
      <table className="ept-table">
        <thead>
          <tr>
            <th>学号</th>
            <th>姓名</th>
            {ASSESSMENT_SUBJECTS.map((s) => (
              <th key={s.id}>{s.name}</th>
            ))}
            <th>总分</th>
            <th>缺材料</th>
            <th>异常</th>
          </tr>
        </thead>
        <tbody>
          {students.map((stu) => (
            <tr
              key={stu.studentId}
              className={stu.studentId === selectedStudentId ? 'ept-row-selected' : ''}
              onClick={() => onSelectStudent(stu)}
              style={{ cursor: 'pointer' }}
            >
              <td className="ept-id">{stu.studentId}</td>
              <td className="ept-name">{stu.studentName}</td>
              {ASSESSMENT_SUBJECTS.map((s) => (
                <td key={s.id} className="ept-score">
                  {stu.subjectScores[s.id as SubjectId] ?? '—'}
                </td>
              ))}
              <td className="ept-total">{stu.totalScore}</td>
              <td>{stu.missingMaterialCount > 0 ? <span className="ept-warn">{stu.missingMaterialCount}</span> : '0'}</td>
              <td>{stu.warningCount > 0 ? <span className="ept-err">{stu.warningCount}</span> : '0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
