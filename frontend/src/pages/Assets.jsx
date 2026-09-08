import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, AlertTriangle, Server, ShieldAlert, ArrowUpRight, Cloud, Filter, GitCompare, CheckCircle2, XCircle, X } from 'lucide-react'
import { api } from '../lib/api.js'

export default function Assets() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const initialCloud = searchParams.get('cloud') || ''

  const [data, setData] = useState({ results: [], total: 0 })
  const [search, setSearch] = useState(initialSearch)
  const [cloud, setCloud] = useState(initialCloud)
  const [loading, setLoading] = useState(true)
  const [ipComparison, setIpComparison] = useState(null)
  const [showIpModal, setShowIpModal] = useState(false)
  const [comparing, setComparing] = useState(false)

  useEffect(() => {
    const params = {}
    if (search) params.search = search
    if (cloud) params.cloud = cloud
    setLoading(true)
    api.listAssets(params).then((d) => {
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [search, cloud])

  async function handleIpComparison() {
    setComparing(true)
    try {
      const res = await api.compareAgentsByIp()
      setIpComparison(res)
      setShowIpModal(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setComparing(false)
    }
  }

  return (
    <div className="px-8 py-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
              UNIFIED INVENTORY
            </span>
            <span className="text-xs text-slate-500 font-mono">QUALYS HOST SENSORS</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">Asset Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.total} unified host assets correlated across Qualys, AWS, and Azure.
          </p>
        </div>

        {/* Actions & Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleIpComparison}
            disabled={comparing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-qred transition-all shadow-sm"
          >
            <GitCompare size={14} className={comparing ? 'animate-spin text-qred' : 'text-qred'} />
            <span>{comparing ? 'Comparing IPs...' : 'Compare Agent IPs with Inv'}</span>
          </button>

          <div className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 rounded-full text-xs w-64 shadow-sm">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
              placeholder="Search hostname, IP, FQDN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-mono shadow-sm">
            {[
              { id: '', label: 'All Clouds' },
              { id: 'AWS', label: 'AWS' },
              { id: 'AZURE', label: 'Azure' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setCloud(p.id)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  cloud === p.id
                    ? 'bg-qblue text-white shadow-sm'
                    : 'text-slate-600 hover:text-qblue'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* IP Comparison Modal */}
      {showIpModal && ipComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-qred flex items-center justify-center border border-red-200">
                  <GitCompare size={18} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 font-display">
                    Qualys Agents vs Cloud Inventory IP Comparison
                  </h2>
                  <p className="text-xs text-slate-500">
                    Exact IP address correlation between scanned Qualys agent sensors and AWS/Azure inventory exports.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowIpModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Qualys Agent Host IPs */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">QUALYS AGENT HOSTS</div>
                <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">
                  {ipComparison.qualys_agents?.total_host_ips?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 mt-1">Total Scanned Host IPs</div>
              </div>

              {/* Matched by IP */}
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="text-[10px] uppercase font-bold text-green-700 font-mono flex items-center gap-1">
                  <CheckCircle2 size={12} /> MATCHED WITH CLOUD
                </div>
                <div className="text-2xl font-extrabold text-green-700 font-display mt-1">
                  {ipComparison.combined_cloud_summary?.total_scanned_by_agent}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Agent Coverage: <strong className="text-green-700">{ipComparison.combined_cloud_summary?.agent_coverage_pct}%</strong>
                </div>
              </div>

              {/* Missing Agent (Shadow IT) */}
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="text-[10px] uppercase font-bold text-orange-700 font-mono flex items-center gap-1">
                  <AlertTriangle size={12} /> SHADOW IT (NO AGENT)
                </div>
                <div className="text-2xl font-extrabold text-orange-700 font-display mt-1">
                  {ipComparison.combined_cloud_summary?.total_shadow_it_ips}
                </div>
                <div className="text-xs text-slate-600 mt-1">Cloud IPs without Qualys scan</div>
              </div>
            </div>

            {/* Provider Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-mono font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Inventory Source</th>
                    <th className="py-2.5 px-3">Total IPs</th>
                    <th className="py-2.5 px-3">Private IPs</th>
                    <th className="py-2.5 px-3">Public IPs</th>
                    <th className="py-2.5 px-3 text-center">Matched with Agent</th>
                    <th className="py-2.5 px-3 text-center">Shadow IT (Unmatched)</th>
                    <th className="py-2.5 px-3 text-right">Coverage %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-orange-700 flex items-center gap-1.5">
                      <Cloud size={14} /> AWS Inventory
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{ipComparison.aws_inventory?.total_ips}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{ipComparison.aws_inventory?.private_ips}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{ipComparison.aws_inventory?.public_ips}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-green-700">
                      {ipComparison.aws_inventory?.matched_with_agent}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-orange-600">
                      {ipComparison.aws_inventory?.missing_agent_shadow_it}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {ipComparison.aws_inventory?.coverage_pct}%
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-blue-700 flex items-center gap-1.5">
                      <Cloud size={14} /> Azure Inventory
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{ipComparison.azure_inventory?.total_ips}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{ipComparison.azure_inventory?.private_ips}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{ipComparison.azure_inventory?.public_ips}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-green-700">
                      {ipComparison.azure_inventory?.matched_with_agent}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600">
                      {ipComparison.azure_inventory?.missing_agent_shadow_it}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {ipComparison.azure_inventory?.coverage_pct}%
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-700">
                      Qualys Network / On-Prem
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{ipComparison.qualys_agents?.unmatched_onprem_or_network}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">—</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">—</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">—</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">—</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">N/A</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowIpModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-mono">
                <th className="py-3 px-4 font-bold">Server / Hostname</th>
                <th className="py-3 px-4 font-bold">IP Address</th>
                <th className="py-3 px-4 font-bold">Cloud / Group</th>
                <th className="py-3 px-4 font-bold">Application</th>
                <th className="py-3 px-4 font-bold">Owner</th>
                <th className="py-3 px-4 font-bold">OS</th>
                <th className="py-3 px-4 font-bold text-center">Critical</th>
                <th className="py-3 px-4 font-bold text-center">High</th>
                <th className="py-3 px-4 font-bold text-center">SLA Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.results.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      to={`/assets/${a.id}`}
                      className="text-slate-900 font-bold hover:text-qred transition-colors flex items-center gap-1.5"
                    >
                      <Server size={14} className="text-qred shrink-0" />
                      <span className="truncate max-w-[220px]">{a.hostname}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{a.ip || '—'}</td>
                  <td className="py-3 px-4">
                    {a.cloud_provider ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.cloud_provider === 'AWS'
                            ? 'bg-orange-50 text-orange-600 border border-orange-200'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}
                      >
                        {a.cloud_provider}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">NETWORK</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{a.application || '—'}</td>
                  <td className="py-3 px-4 text-slate-500">{a.owner || '—'}</td>
                  <td className="py-3 px-4 text-slate-500 truncate max-w-[140px]">{a.os || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    {a.critical > 0 ? (
                      <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-red-50 text-qred border border-red-200">
                        {a.critical}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {a.high > 0 ? (
                      <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                        {a.high}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {a.sla_breached ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-qred bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={11} /> Breached
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-semibold border border-green-200">
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/assets/${a.id}`}
                      className="text-slate-700 hover:text-qred hover:underline inline-flex items-center gap-0.5 text-xs font-mono font-bold"
                    >
                      Inspect <ArrowUpRight size={12} className="text-qred" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && data.results.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs">
              No assets matched your search filter.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
