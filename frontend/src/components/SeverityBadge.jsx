const CONFIG = {
  5: { label: 'Critical', color: 'text-red-700', border: 'border-red-200', bg: 'bg-red-50', dot: 'bg-red-600' },
  4: { label: 'High', color: 'text-orange-700', border: 'border-orange-200', bg: 'bg-orange-50', dot: 'bg-orange-600' },
  3: { label: 'Medium', color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50', dot: 'bg-amber-600' },
  2: { label: 'Low', color: 'text-slate-700', border: 'border-slate-200', bg: 'bg-slate-50', dot: 'bg-slate-500' },
  1: { label: 'Info', color: 'text-slate-700', border: 'border-slate-200', bg: 'bg-slate-50', dot: 'bg-slate-500' },
}

export default function SeverityBadge({ severity }) {
  const c = CONFIG[severity] || CONFIG[1]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${c.border} ${c.bg} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

export function SlaBadge({ status }) {
  if (!status) return <span className="text-slate-400 text-xs font-mono">—</span>
  const map = {
    BREACHED: { label: 'Breached', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    WITHIN_SLA: { label: 'Within SLA', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    FIXED: { label: 'Fixed', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
    EXCEPTION: { label: 'Exception', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  }
  const c = map[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${c.border} ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  )
}
