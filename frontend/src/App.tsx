import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { SubjectPage } from './pages/SubjectPage';
import { ExportPage } from './pages/ExportPage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/moral" replace />} />
        <Route path="/moral" element={<SubjectPage subjectId="moral" />} />
        <Route path="/academic" element={<SubjectPage subjectId="academic" />} />
        <Route path="/sports" element={<SubjectPage subjectId="sports" />} />
        <Route path="/aesthetic" element={<SubjectPage subjectId="aesthetic" />} />
        <Route path="/labor" element={<SubjectPage subjectId="labor" />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/moral" replace />} />
      </Routes>
    </AppShell>
  );
}
