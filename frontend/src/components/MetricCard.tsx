import './MetricCard.css';

interface MetricCardProps {
  label: string;
  value?: string | number;
  placeholder?: string;
}

export function MetricCard({ label, value, placeholder = '—' }: MetricCardProps) {
  return (
    <div className="metric-card">
      <span className="metric-card-label">{label}</span>
      <span className="metric-card-value">{value ?? placeholder}</span>
    </div>
  );
}
