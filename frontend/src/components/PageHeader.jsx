export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between px-8 pt-8 pb-6 border-b border-hairline">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
