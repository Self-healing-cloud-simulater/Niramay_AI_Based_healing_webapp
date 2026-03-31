/**
 * SkeletonBlock — Shimmer loading rows.
 * Multiple variants: text lines, circles, chart areas.
 * Uses CSS shimmer sweep animation.
 */

export function SkeletonRow() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-2)',
    }}>
      <div className="skeleton skeleton-circle" style={{ width: 7, height: 7, flexShrink: 0 }} />
      <div className="skeleton skeleton-text" style={{ width: 36, height: 12 }} />
      <div className="skeleton skeleton-text" style={{ flex: 1, height: 14 }} />
      <div className="skeleton skeleton-text" style={{ width: 40, height: 12 }} />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div style={{ padding: 'var(--space-4)', height: 60 }}>
      <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)' }} />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div style={{
      flex: '1 1 0',
      textAlign: 'center',
      padding: 'var(--space-6) var(--space-4)',
    }}>
      <div className="skeleton skeleton-text" style={{ width: 50, height: 10, margin: '0 auto var(--space-3)' }} />
      <div className="skeleton skeleton-text" style={{ width: 60, height: 28, margin: '0 auto' }} />
    </div>
  );
}

export default function SkeletonBlock() {
  return (
    <div>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}
