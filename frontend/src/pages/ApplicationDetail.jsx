import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Network, Server, ShieldAlert, AlertTriangle, User, Globe, CreditCard, ExternalLink, ArrowRight } from 'lucide-react'
import { api } from '../lib/api.js'
import SeverityBadge, { SlaBadge } from '../components/SeverityBadge.jsx'

export default function ApplicationDetail() {
  const { id } = useParams()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.applicationDetail(id).then((res) => {
      setApp(res)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading || !app) {
    return <div className="p-12 text-center text-slate-500 text-xs font-mono">Loading application context…</div>
  }

  return (
    <div className="px-8 py-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div>
        <Link to="/applications" className="text-xs font-bold text-qred hover:underline inline-flex items-center gap-1 mb-3">
          <ArrowLeft size={13} /> Back to Applications Catalog
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
                APPLICATION WORKLOAD
              </span>
              {app.apm_id && (
                <span className="text-xs text-slate-500 font-mono font-bold">APM ID: {app.apm_id}</span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-display">{app.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Environment: <strong className="text-slate-800">{app.environment || 'Production'}</strong> · Owner: <strong className="text-slate-800">{app.technical_owner || 'Unassigned'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 5 Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Assets</p>
          <p className="text-2xl font-extrabold text-slate-900 font-display mt-1">{app.assets}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Open Findings</p>
          <p className="text-2xl font-extrabold text-slate-900 font-display mt-1">{app.vulnerabilities_open}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Fixed</p>
          <p className="text-2xl font-extrabold text-green-600 font-display mt-1">{app.fixed}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Reopened</p>
          <p className="text-2xl font-extrabold text-orange-600 font-display mt-1">{app.reopened}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">SLA Breached</p>
          <p className={`text-2xl font-extrabold font-display mt-1 ${app.sla_breached > 0 ? 'text-qred' : 'text-green-600'}`}>
            {app.sla_breached}
          </p>
        </div>
      </div>

      {/* Top QIDs & Most Vulnerable Servers Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={16} className="text-qred" />
            <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
              Top Active Vulnerabilities
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {app.top_qids.map((q) => (
              <div key={q.qid} className="py-2.5 flex items-center justify-between">
                <Link to={`/vulnerabilities/${q.qid}`} className="font-mono font-bold text-qred hover:underline">
                  QID {q.qid}
                </Link>
                <span className="font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                  {q.count} findings
                </span>
              </div>
            ))}
            {app.top_qids.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No active vulnerabilities recorded.</p>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} className="text-qred" />
            <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
              Most Vulnerable Host Assets
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {app.most_vulnerable_servers.map((s, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-900 truncate max-w-xs">{s.hostname}</span>
                <span className="font-mono px-2 py-0.5 rounded bg-red-50 text-qred border border-red-200 font-bold">
                  {s.open_findings} findings
                </span>
              </div>
            ))}
            {app.most_vulnerable_servers.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No vulnerable servers found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
