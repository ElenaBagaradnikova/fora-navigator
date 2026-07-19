export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="FORA Navigator">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[var(--teal)] text-white shadow-[0_4px_0_var(--teal-dark)]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
          <path d="M7 24.5c3-8.6 7.2-13 18-17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="8" cy="24" r="3" fill="#F1C85B" />
          <path d="m21 6 5 1-1.5 5" stroke="#F1C85B" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[0.72rem] font-extrabold tracking-[0.18em] text-[var(--coral)]">FORA</span>
          <span className="display-font mt-1 block text-xl">Navigator</span>
        </span>
      )}
    </div>
  );
}
