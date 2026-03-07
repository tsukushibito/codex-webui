interface PlaceholderPanelProps {
  body: string;
  title: string;
}

export function PlaceholderPanel({ body, title }: PlaceholderPanelProps) {
  return <div className="placeholder-card">{title}: {body}</div>;
}
