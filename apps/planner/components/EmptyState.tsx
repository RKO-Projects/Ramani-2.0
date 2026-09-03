interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export default function EmptyState({ icon = "📭", title, message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <span className="empty-state-title">{title}</span>
      {message && <span>{message}</span>}
    </div>
  );
}
