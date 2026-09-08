import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Building2,
  User,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Flame,
  Calendar,
  Sparkles,
  BarChart2,
  RotateCcw,
  CheckCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { api } from '../lib/api.js'
import SeverityBadge from '../components/SeverityBadge.jsx'

export default function SlaGovernance() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apmFilter, setApmFilter] = useState('')
  const [assetGroupFilter, setAssetGroupFilter] = useState('')
  const [search, setSearch] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const res = await api.slaGovernance({
        apm_id: apmFilter || undefined,
        asset_group: assetGroupFilter || undefined,
      })
      setData(res)
    } catch (err) {
      console.error('Error loading SLA governance:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [apmFilter, assetGroupFilter])

  const priorityQueue = (data?.priority_queue || []).filter((item) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.qid && item.qid.toLowerCase().includes(term)) ||
      (item.cve && item.cve.toLowerCase().includes(term)) ||
      (item.hostname && item.hostname.toLowerCase().includes(term)) ||
      (item.ip && item.ip.toLowerCase().includes(term)) ||
      (item.apm_id && item.apm_id.toLowerCase().includes(term)) ||
      (item.app_owner && item.app_owner.toLowerCase().includes(term))
    )
  })

  const sevBreakdown = data?.severity_breakdown || []

  return (
    <div className="px-8 py-8 space-y-6 max-w-[1700px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
              ENTERPRISE REMEDIATION ENGINE
            </span>
            <span className="text-xs text-slate-500 font-mono">
              SLA RULES: SEV 5 = 30d • SEV 4 = 90/120d • SEV 3 = 180d
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            SLA Governance &amp; Remediation Velocity
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time compliance tracking, breach velocity, priority queue, and APM remediation leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/vulnerabilities"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-red-700 shadow-md shadow-red-500/20 transition-all flex items-center gap-1.5"
          >
            <span>Open Findings Table</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* 4 Executive SLA Posture KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Rate Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center justify-between">
              <span>OVERALL SLA COMPLIANCE</span>
              <span className={`w-2.5 h-2.5 rounded-full ${data?.compliance_rate >= 80 ? 'bg-green-500' : 'bg-qred animate-ping'}`} />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-display mt-2">
              {data?.compliance_rate || 0}%
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Within SLA: <strong className="text-green-700">{data?.within_sla_count?.toLocaleString()}</strong></span>
            <span>Total Open: <strong className="text-slate-800">{data?.total_open?.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Overdue Breaches Card */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex flex-col justify-between hover:border-qred transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-qred font-mono flex items-center justify-between">
              <span>OVERDUE SLA BREACHES</span>
              <Zap size={14} className="text-qred" />
            </div>
            <div className="text-3xl font-extrabold text-qred font-display mt-2">
              {data?.breached_count?.toLocaleString()}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Immediate escalation required
          </div>
        </div>

        {/* Severity 5 & 4 Open Card */}
        <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm flex flex-col justify-between hover:border-orange-400 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-orange-700 font-mono flex items-center justify-between">
              <span>CRITICAL &amp; HIGH (SEV 5 &amp; 4)</span>
              <Flame size={14} className="text-orange-600" />
            </div>
            <div className="text-3xl font-extrabold text-orange-600 font-display mt-2">
              {(
                (sevBreakdown.find((s) => s.severity === 5)?.total || 0) +
                (sevBreakdown.find((s) => s.severity === 4)?.total || 0)
              ).toLocaleString()}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Sev 5 (30d): <strong>{sevBreakdown.find((s) => s.severity === 5)?.total || 0}</strong></span>
            <span>Sev 4 (90/120d): <strong>{sevBreakdown.find((s) => s.severity === 4)?.total || 0}</strong></span>
          </div>
        </div>

        {/* Total Remediated Fixed Card */}
        <div className="bg-white p-5 rounded-2xl border border-green-200 shadow-sm flex flex-col justify-between hover:border-green-400 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-green-700 font-mono flex items-center justify-between">
              <span>REMEDIATED &amp; FIXED</span>
              <CheckCircle2 size={14} className="text-green-600" />
            </div>
            <div className="text-3xl font-extrabold text-green-700 font-display mt-2">
              {data?.total_fixed?.toLocaleString()}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Verified closed in Qualys
          </div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Asset Group Pills */}
          <div className="flex items-center gap-1.5">
            {[
              { id: '', label: 'All Groups' },
              { id: 'AWS', label: 'AWS' },
              { id: 'AZURE', label: 'Azure' },
              { id: 'NETWORK', label: 'Network' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setAssetGroupFilter(g.id)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                  assetGroupFilter === g.id
                    ? 'bg-qblue text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-64">
            <Building2 size={14} className="text-qblue shrink-0" />
            <input
              type="text"
              placeholder="Filter by APM ID (e.g. APM0001675)..."
              value={apmFilter}
              onChange={(e) => setApmFilter(e.target.value)}
              className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-64">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search finding, QID, host, owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
            />
          </div>
        </div>

        {apmFilter && (
          <button
            onClick={() => setApmFilter('')}
            className="text-xs text-qred hover:underline font-bold"
          >
            Clear APM Filter
          </button>
        )}
      </div>

      {/* Middle Section: Severity Target Breakdown & Remediation Priority Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity SLA Rules Breakdown Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-qblue" />
              <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
                SLA Rules by Severity
              </h3>
            </div>

            <div className="space-y-3">
              {sevBreakdown.map((s) => (
                <div key={s.severity} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900">{s.label}</span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-white border border-slate-200">
                      Target: {s.target_days}d {s.special_target ? `(${s.special_target})` : ''}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden my-2">
                    <div
                      className="bg-qred h-2 rounded-full"
                      style={{
                        width: `${s.total > 0 ? (s.breached / s.total) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                    <span className="text-qred font-bold">{s.breached} Breached</span>
                    <span className="text-slate-500">{s.within} Within Target</span>
                    <span className="text-slate-800 font-bold">{s.total} Total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed font-mono">
            * Severity 4 is expedited to 90 days for Internet-Facing and PCI-scoped systems.
          </div>
        </div>

        {/* Priority Remediation Queue Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-qred" />
                <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
                  Remediation Priority Queue
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Showing {priorityQueue.length} high-urgency findings
              </span>
            </div>

            <div className="overflow-x-auto max-h-[380px] border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-mono font-bold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Sev</th>
                    <th className="py-2.5 px-3">Finding Title / QID</th>
                    <th className="py-2.5 px-3">Target Host</th>
                    <th className="py-2.5 px-3">APM / App Owner</th>
                    <th className="py-2.5 px-3 text-center">SLA Target</th>
                    <th className="py-2.5 px-3 text-center">Days Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {priorityQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <SeverityBadge severity={item.severity} />
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px] truncate font-semibold text-slate-900">
                        <Link to={`/vulnerabilities/${item.qid}`} className="hover:text-qred">
                          {item.title}
                        </Link>
                        <div className="text-[10px] font-mono text-slate-400">QID: {item.qid} • {item.cve}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        <div>{item.ip}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{item.hostname}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-qblue">{item.apm_id}</div>
                        <div className="text-[10px] text-slate-500">{item.app_owner}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {item.sla_target_days}d
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {item.is_breached ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-50 text-qred border border-red-200">
                            {Math.abs(item.days_left)}d Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                            {item.days_left}d Left
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to={`/vulnerabilities/${item.qid}`}
                          className="text-qblue hover:underline inline-flex items-center gap-0.5 font-bold"
                        >
                          Inspect <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {priorityQueue.length === 0 && !loading && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No overdue or imminent SLA breaches matching the filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: APM SLA Compliance Leaderboard */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-qblue" />
            <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
              Application APM Compliance Leaderboard
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Sorted by total overdue breaches
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-mono font-bold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">APM ID</th>
                <th className="py-2.5 px-3">Application Name</th>
                <th className="py-2.5 px-3">IT App Owner</th>
                <th className="py-2.5 px-3">Business Owner</th>
                <th className="py-2.5 px-3 text-center">Compliance Rate</th>
                <th className="py-2.5 px-3 text-center">Open Findings</th>
                <th className="py-2.5 px-3 text-center">Breached (Overdue)</th>
                <th className="py-2.5 px-3 text-center">Sev 5 / Sev 4</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.apm_leaderboard || []).map((apm, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-qblue">
                    {apm.apm_id}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    {apm.app_name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {apm.app_owner}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {apm.business_owner}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            apm.compliance_rate >= 80 ? 'bg-green-500' : apm.compliance_rate >= 50 ? 'bg-orange-500' : 'bg-qred'
                          }`}
                          style={{ width: `${apm.compliance_rate}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-[11px]">{apm.compliance_rate}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-800">
                    {apm.total_open}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {apm.breached > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-red-50 text-qred font-bold text-[10px] border border-red-200">
                        {apm.breached}
                      </span>
                    ) : (
                      <span className="text-green-700 font-bold">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    <span className="text-qred font-bold">{apm.crit}C</span> / <span className="text-orange-600 font-bold">{apm.high}H</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      to={`/apms?search=${encodeURIComponent(apm.apm_id)}`}
                      className="text-qblue hover:underline font-bold"
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
