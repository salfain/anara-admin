// Placeholder shapes shown while a page's first fetch is in flight. Each one
// mirrors the layout it replaces so the content does not jump when it lands.

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        // The last line is short, the way a real paragraph ends.
        <Skeleton key={i} className="h-3.5" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-gray-med rounded-xl p-6 flex flex-col gap-3">
          <div className="flex justify-between items-start gap-4">
            <Skeleton className="h-4 flex-1" style={{ maxWidth: '55%' }} />
            <Skeleton className="h-8 w-24 rounded-full shrink-0" />
          </div>
          <SkeletonText lines={2} />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 4 }) {
  return Array.from({ length: rows }).map((_, r) => (
    <tr key={r}>
      {Array.from({ length: cols }).map((_, c) => (
        <td key={c} className="px-2 py-3">
          <Skeleton className="h-3.5" style={{ width: c === 0 ? '80%' : '60%' }} />
        </td>
      ))}
    </tr>
  ));
}

export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default Skeleton;
