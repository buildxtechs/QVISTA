import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import {
  Network,
  Server,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Globe,
  CreditCard,
  Building,
  User,
  Search,
} from 'lucide-react'

export default function Applications() {
  const [apps, setApps] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.listApplications().then((res) => {
      setApps(res || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredApps = apps.filter((a) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      a.name?.toLowerCase().includes(s) ||
      a.apm_id?.toLowerCase().includes(s) ||
      a.technical_owner?.toLowerCase().includes(s) ||
      a.organization?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="px-8 py-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
              BUSINESS CONTEXT
            </span>
            <span className="text-xs text-slate-500 font-mono">APPLICATIONS &amp; CMDB ENTITIES</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">Applications &amp; Workloads</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {apps.length} applications correlated from CMDB spreadsheets and cloud inventories.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 rounded-full text-xs w-72 shadow-sm">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
            placeholder="Search application, APM ID, owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Interactive Application Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredApps.map((a) => (
          <Link
            key={a.id}
            to={`/applications/${a.id}`}
            className="glass-panel p-5 rounded-2xl border border-slate-200 hover:border-qred transition-all flex flex-col justify-between space-y-4 group shadow-sm hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-red-50 text-qred border border-red-200">
                      <Network size={15} />
                    </span>
                    <h3 className="font-display font-extrabold text-slate-900 text-base group-hover:text-qred transition-colors">
                      {a.name}
                    </h3>
                  </div>
                  {a.apm_id && (
                    <span className="text-[11px] font-mono text-slate-500 font-semibold block mt-1">
                      APM ID: <span className="text-slate-900 font-bold">{a.apm_id}</span>
                    </span>
                  )}
                </div>

                {a.environment && (
                  <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    {a.environment}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 py-2 border-b border-slate-100">
                <span className="flex items-center gap-1">
                  <Server size={12} className="text-qred" />
                  <strong className="text-slate-800">{a.assets}</strong> assets
                </span>
                {a.technical_owner && (
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    <User size={12} className="text-slate-400" /> {a.technical_owner}
                  </span>
                )}
              </div>
            </div>

            {/* Severity Matrix Stat Box */}
            <div className="grid grid-cols-4 gap-2 text-center py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono">
              <div>
                <p className="text-base font-extrabold text-qred">{a.critical}</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Crit</p>
              </div>
              <div>
                <p className="text-base font-bold text-orange-600">{a.high}</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">High</p>
              </div>
              <div>
                <p className="text-base font-bold text-amber-600">{a.medium}</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Med</p>
              </div>
              <div>
                <p className={`text-base font-bold ${a.sla_breached > 0 ? 'text-qred' : 'text-green-600'}`}>
                  {a.sla_breached}
                </p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">SLA</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-slate-400">{a.organization || 'Core Platform'}</span>
              <span className="text-slate-700 group-hover:text-qred flex items-center gap-1 font-mono font-bold">
                Inspect App <ArrowRight size={12} className="text-qred" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!loading && filteredApps.length === 0 && (
        <div className="glass-panel p-12 text-center text-slate-500 text-xs rounded-2xl border border-slate-200 space-y-3">
          <p>No applications match your search query.</p>
          <p className="text-slate-400">Applications are automatically indexed when you upload a CMDB spreadsheet or cloud inventory.</p>
        </div>
      )}
    </div>
  )
}
