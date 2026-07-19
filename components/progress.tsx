export function Progress({ current, total, label }: { current: number; total: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return (
    <div className="w-full" aria-label={label || `Шаг ${current} из ${total}`}>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm font-bold text-[var(--muted)]">
        <span>{label || `Шаг ${current} из ${total}`}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#dbe3df]" aria-hidden="true">
        <div className="h-full rounded-full bg-[var(--coral)] transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
