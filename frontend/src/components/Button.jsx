export default function Button({ children, variant = 'default', ...props }) {
  const base = 'inline-flex items-center gap-2 px-3.5 py-2 text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    default: 'border-hairline bg-raised text-ink hover:border-phosphor/50',
    primary: 'border-phosphor bg-phosphor/10 text-phosphor hover:bg-phosphor/20',
    ghost: 'border-transparent text-muted hover:text-ink',
  }
  return (
    <button className={`${base} ${variants[variant]}`} {...props}>
      {children}
    </button>
  )
}
