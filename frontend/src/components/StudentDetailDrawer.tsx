import { X } from 'lucide-react';
import type { StudentScorePreview, SubjectId } from '../types/zongce';
import { ASSESSMENT_SUBJECTS } from '../types/zongce';
import './StudentDetailDrawer.css';

interface Props {
  student: StudentScorePreview;
  onClose: () => void;
}

export function StudentDetailDrawer({ student, onClose }: Props) {
  return (
    <div className="sdd-overlay" onClick={onClose}>
      <div className="sdd-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="sdd-header">
          <h2 className="sdd-title">
            {student.studentName}
            <span className="sdd-id">{student.studentId}</span>
          </h2>
          <button className="sdd-close" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <div className="sdd-total">
          <span className="sdd-total-label">总分</span>
          <span className="sdd-total-value">{student.totalScore}</span>
        </div>

        <div className="sdd-subjects">
          {ASSESSMENT_SUBJECTS.map((s) => {
            const score = student.subjectScores[s.id as SubjectId];
            return (
              <div key={s.id} className="sdd-subject-card">
                <div className="sdd-subject-header">
                  <span className="sdd-subject-name">{s.name}</span>
                  <span className="sdd-subject-score">{score ?? '—'}</span>
                </div>
                <div className="sdd-subject-detail">
                  <span>基础分 + 加分 - 扣分</span>
                </div>
              </div>
            );
          })}
        </div>

        {student.missingMaterialCount > 0 && (
          <div className="sdd-warning">
            缺 {student.missingMaterialCount} 项材料
          </div>
        )}
        {student.warningCount > 0 && (
          <div className="sdd-error">
            {student.warningCount} 项异常
          </div>
        )}
      </div>
    </div>
  );
}
