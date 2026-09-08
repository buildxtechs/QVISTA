import { TrendingUp, TrendingDown } from 'lucide-react'

const ICON_THEMES = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-qred',
    glow: '',
  },
  cyan: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-600',
    glow: '',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    glow: '',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-qred',
    glow: 'shadow-red-pill',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    glow: '',
  },
  teal: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    glow: '',
  },
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  theme = 'red',
  trendText,
  trendDirection = 'up', // 'up' | 'down'
  trendTone = 'red', // 'red' | 'green' | 'amber'
  onClick,
}) {
  const t = ICON_THEMES[theme] || ICON_THEMES.red

  const getTrendColor = () => {
    if (trendTone === 'green' || trendTone === 'phosphor') return 'text-green-600'
    if (trendTone === 'red' || trendTone === 'critical' || trendTone === 'qred') return 'text-qred font-semibold'
    if (trendTone === 'amber') return 'text-amber-600'
    return 'text-slate-600'
  }

  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value

  return (
    <div
      onClick={onClick}
      className={`kpi-card p-5 relative overflow-hidden flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 font-mono">
          {label}
        </span>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${t.bg} ${t.border} ${t.text}`}
          >
            <Icon size={17} strokeWidth={2.2} />
          </div>
        )}
      </div>

      <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-display my-1">
        {formattedValue}
      </div>

      {trendText && (
        <div className={`flex items-center gap-1.5 text-xs font-mono mt-2 ${getTrendColor()}`}>
          {trendDirection === 'up' ? (
            <TrendingUp size={13} strokeWidth={2.2} />
          ) : (
            <TrendingDown size={13} strokeWidth={2.2} />
          )}
          <span>{trendText}</span>
        </div>
      )}
    </div>
  )
}
