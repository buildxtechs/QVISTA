export default function StatTile({ label, value, tone = 'default', sub }) {
  const toneColor = {
    default: 'text-ink',
    critical: 'text-critical',
    high: 'text-high',
    medium: 'text-medium',
    phosphor: 'text-phosphor',
  }[tone]

  return (
    <div className="border border-hairline bg-surface px-5 py-4 flex flex-col gap-1 min-w-[140px]">
      <span className="text-[11px] uppercase tracking-wider text-dim">{label}</span>
      <span className={`font-display text-3xl font-semibold ${toneColor}`}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}
