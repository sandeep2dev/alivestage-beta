export default function FormAlert({ type = 'error', children }) {
  if (!children) return null;
  const className = type === 'success' ? 'alert alertSuccess' : 'alert alertError';
  return (
    <div className={className} role="alert" aria-live="polite">
      {children}
    </div>
  );
}
