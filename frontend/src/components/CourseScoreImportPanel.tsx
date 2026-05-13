import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import './CourseScoreImportPanel.css';

interface Props {
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
}

export function CourseScoreImportPanel({ onFileSelect, disabled = false }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (disabled) return;
    if (!newFiles || newFiles.length === 0) return;
    const names = Array.from(newFiles).map((f) => f.name);
    setFiles((prev) => {
      const merged = [...prev];
      for (const n of names) {
        if (!merged.includes(n)) merged.push(n);
      }
      return merged;
    });
    // Notify parent about the first selected file for calculation
    if (newFiles.length > 0 && onFileSelect) {
      onFileSelect(newFiles[0]);
    }
  }, [onFileSelect, disabled]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleReimport = useCallback(() => {
    setFiles([]);
  }, []);

  return (
    <div className="csip-panel">
      <h2 className="csip-title">课程分数文件导入</h2>

      <div
        className={`csip-dropzone${dragOver ? ' csip-dropzone-active' : ''}${disabled ? ' csip-dropzone-disabled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
      >
        <Upload size={22} strokeWidth={1.5} className="csip-dropzone-icon" />
        <span className="csip-dropzone-text">{disabled ? '该科目无需导入课程文件' : '上传课程分数文件'}</span>
        <span className="csip-dropzone-hint">{disabled ? '基础分后续从设置中读取' : '或拖拽文件到这里'}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="csip-hidden-input"
        disabled={disabled}
        onChange={(e) => addFiles(e.target.files)}
      />

      <p className="csip-formats">{disabled ? '当前仅智育和体育基础分支持课程文件导入' : '支持格式：.xlsx / .xls / .csv'}</p>

      {files.length > 0 && (
        <div className="csip-file-list">
          <span className="csip-file-list-label">已导入文件：</span>
          {files.map((name) => (
            <div key={name} className="csip-file-item">
              <FileSpreadsheet size={16} strokeWidth={1.5} className="csip-file-icon" />
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}

      <button className="csip-reimport-btn" onClick={handleReimport}>
        重新导入
      </button>
    </div>
  );
}
