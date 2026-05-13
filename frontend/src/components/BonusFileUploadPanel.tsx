import { useState, useCallback, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import type { BonusItem } from '../types/zongce';
import './BonusFileUploadPanel.css';

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `bonus-${Date.now()}-${idCounter}`;
}

function makeBonusItem(fileName: string): BonusItem {
  const base = fileName.replace(/\.(pdf|png|jpe?g)$/i, '');
  return {
    id: nextId(),
    name: base,
    score: 3,
    material: fileName,
    description: '根据上传证明文件生成的待确认附加分',
  };
}

interface Props {
  onFilesChange: (items: BonusItem[]) => void;
}

export function BonusFileUploadPanel({ onFilesChange }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;
      const names = Array.from(newFiles).map((f) => f.name);
      const added: string[] = [];
      setFiles((prev) => {
        const merged = [...prev];
        for (const n of names) {
          if (!merged.includes(n)) {
            merged.push(n);
            added.push(n);
          }
        }
        return merged;
      });
      if (added.length > 0) {
        const newItems = added.map(makeBonusItem);
        onFilesChange(newItems);
      }
    },
    [onFilesChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleReidentify = useCallback(() => {
    setFiles([]);
  }, []);

  return (
    <div className="bfup-panel">
      <h2 className="bfup-title">证明文件上传</h2>

      <div
        className={`bfup-dropzone${dragOver ? ' bfup-dropzone-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={22} strokeWidth={1.5} className="bfup-dropzone-icon" />
        <span className="bfup-dropzone-text">上传证明文件</span>
        <span className="bfup-dropzone-hint">或拖拽文件到这里</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        multiple
        className="bfup-hidden-input"
        onChange={(e) => addFiles(e.target.files)}
      />

      <p className="bfup-formats">支持格式：.pdf / .png / .jpg / .jpeg</p>

      {files.length > 0 && (
        <div className="bfup-file-list">
          <span className="bfup-file-list-label">已上传证明：</span>
          {files.map((name) => (
            <div key={name} className="bfup-file-item">
              <FileText size={16} strokeWidth={1.5} className="bfup-file-icon" />
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}

      <button className="bfup-reidentify-btn" onClick={handleReidentify}>
        重新识别附加分
      </button>
    </div>
  );
}
