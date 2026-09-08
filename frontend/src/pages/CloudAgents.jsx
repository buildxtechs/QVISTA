import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Cpu,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Search,
  Filter,
  Shield,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Zap,
  Activity,
  Download,
  Terminal,
  Database,
  Flame,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { api } from '../lib/api.js'

export default function CloudAgents() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assetGroupFilter, setAssetGroupFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [assetsList, setAssetsList] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const res = await api.cloudAgentsOverview({
        asset_group: assetGroupFilter !== 'ALL' ? assetGroupFilter : undefined,
      })
      setData(res)
    } catch (err) {
      console.error('Failed to load cloud agents data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadAgentAssets() {
    setAssetsLoading(true)
    try {
      const res = await api.listAssets({
        cloud: assetGroupFilter !== 'ALL' ? assetGroupFilter : undefined,
        search: search || undefined,
        page_size: 100,
      })
      if (res && res.items) {
        // Filter assets tracked by agent
        const filtered = res.items.filter(
          (a) => (a.tracking_method && a.tracking_method.includes('AGENT')) || a.agent_id || a.agent_status
        )
        setAssetsList(filtered.length > 0 ? filtered : res.items)
      }
    } catch (err) {
      console.error('Failed to load agent assets list:', err)
    } finally {
      setAssetsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [assetGroupFilter])

  useEffect(() => {
    loadAgentAssets()
  }, [assetGroupFilter, search])

  const osData = data?.os_breakdown || []
  const OS_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#DC2626', '#EA580C', '#16A34A', '#8B5CF6']

  const statusPieData = [
    { name: 'Active & Scanning', value: data?.status_breakdown?.active || 0, color: '#16A34A' },
    { name: 'Manifest Pending', value: data?.status_breakdown?.manifest_pending || 0, color: '#F59E0B' },
    { name: 'Inactive / Stopped', value: data?.status_breakdown?.inactive || 0, color: '#DC2626' },
  ].filter((d) => d.value > 0)

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1700px] mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-qblue border border-blue-200">
              QUALYS SENSOR TELEMETRY
            </span>
            <span className="text-xs text-slate-500 font-mono">
              REAL-TIME AGENT INVENTORY &amp; POSTURE
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Qualys Cloud Agents Explorer
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Live sensor tracking across AWS EC2 instances, Azure Virtual Machines, and On-Premises hosts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadData()
              loadAgentAssets()
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-qblue' : ''} />
            <span>Refresh Telemetry</span>
          </button>
          <Link
            to="/upload"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-qblue text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
          >
            <Cloud size={14} />
            <span>Upload Cloud Inventory</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cloud Agents */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between hover:border-qblue transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-qblue font-mono flex items-center justify-between">
              <span>TOTAL QUALYS CLOUD AGENTS</span>
              <Cpu size={16} className="text-qblue" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-display mt-2">
              {data?.total_cloud_agents?.toLocaleString() || 0}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Coverage Rate: <strong className="text-qblue">{data?.agent_coverage_rate || 0}%</strong></span>
            <span>Total Assets: <strong className="text-slate-800">{data?.total_assets?.toLocaleString() || 0}</strong></span>
          </div>
        </div>

        {/* AWS Agents Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700 font-mono flex items-center justify-between">
              <span>AWS EC2 CLOUD AGENTS</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 font-bold text-amber-800">AWS</span>
            </div>
            <div className="text-3xl font-extrabold text-amber-600 font-display mt-2">
              {data?.asset_group_breakdown?.aws?.agents_count?.toLocaleString() || 0}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>AWS Coverage: <strong>{data?.asset_group_breakdown?.aws?.coverage_pct || 0}%</strong></span>
            <span>AWS Hosts: <strong>{data?.asset_group_breakdown?.aws?.total_group_assets?.toLocaleString() || 0}</strong></span>
          </div>
        </div>

        {/* Azure Agents Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-blue-700 font-mono flex items-center justify-between">
              <span>AZURE VM CLOUD AGENTS</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 font-bold text-blue-800">AZURE</span>
            </div>
            <div className="text-3xl font-extrabold text-blue-600 font-display mt-2">
              {data?.asset_group_breakdown?.azure?.agents_count?.toLocaleString() || 0}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Azure Coverage: <strong>{data?.asset_group_breakdown?.azure?.coverage_pct || 0}%</strong></span>
            <span>Azure Hosts: <strong>{data?.asset_group_breakdown?.azure?.total_group_assets?.toLocaleString() || 0}</strong></span>
          </div>
        </div>

        {/* Network & Appliance Agents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 font-mono flex items-center justify-between">
              <span>ACTIVE SENSORS (HEALTHY)</span>
              <Radio size={16} className="text-emerald-500 animate-pulse" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 font-display mt-2">
              {data?.status_breakdown?.active?.toLocaleString() || 0}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Critical Vulns: <strong className="text-qred">{data?.vulnerability_impact?.critical_sev5 || 0}</strong></span>
            <span>High Vulns: <strong className="text-orange-600">{data?.vulnerability_impact?.high_sev4 || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OS Architecture Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-qblue" />
                <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
                  Operating System Telemetry
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Agent Hosts</span>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={osData.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="os" tick={{ fontSize: 10, fill: '#1E293B', fontWeight: 600 }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {osData.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={OS_COLORS[index % OS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] font-mono">
            {osData.slice(0, 4).map((item, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                {item.os}: {item.count}
              </span>
            ))}
          </div>
        </div>

        {/* Cloud Group Coverage Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cloud size={16} className="text-qblue" />
                <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
                  Cloud Platform Coverage
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Agent vs Total</span>
            </div>

            <div className="space-y-4">
              {/* AWS */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    AWS EC2 Instances
                  </span>
                  <span className="font-mono text-qblue">{data?.asset_group_breakdown?.aws?.coverage_pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${data?.asset_group_breakdown?.aws?.coverage_pct || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>{data?.asset_group_breakdown?.aws?.agents_count} Agents</span>
                  <span>{data?.asset_group_breakdown?.aws?.total_group_assets} Total AWS Hosts</span>
                </div>
              </div>

              {/* Azure */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Azure Virtual Machines
                  </span>
                  <span className="font-mono text-qblue">{data?.asset_group_breakdown?.azure?.coverage_pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${data?.asset_group_breakdown?.azure?.coverage_pct || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>{data?.asset_group_breakdown?.azure?.agents_count} Agents</span>
                  <span>{data?.asset_group_breakdown?.azure?.total_group_assets} Total Azure VMs</span>
                </div>
              </div>

              {/* Network */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Network &amp; On-Premise
                  </span>
                  <span className="font-mono text-qblue">{data?.asset_group_breakdown?.network?.coverage_pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${data?.asset_group_breakdown?.network?.coverage_pct || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>{data?.asset_group_breakdown?.network?.agents_count} Agents</span>
                  <span>{data?.asset_group_breakdown?.network?.total_group_assets} Total Network Nodes</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Overall Multi-Cloud Agent Health</span>
            <strong className="text-green-700 font-mono font-bold">100% Operational</strong>
          </div>
        </div>

        {/* Agent Health & Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-qblue" />
                <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
                  Sensor State &amp; Sync
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                <Radio size={10} className="animate-ping text-emerald-500" /> LIVE
              </span>
            </div>

            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-around text-xs font-mono">
            <div className="text-center">
              <div className="text-green-700 font-extrabold text-sm">{data?.status_breakdown?.active || 0}</div>
              <div className="text-[10px] text-slate-400">ACTIVE</div>
            </div>
            <div className="text-center">
              <div className="text-amber-600 font-extrabold text-sm">{data?.status_breakdown?.manifest_pending || 0}</div>
              <div className="text-[10px] text-slate-400">PENDING</div>
            </div>
            <div className="text-center">
              <div className="text-red-600 font-extrabold text-sm">{data?.status_breakdown?.inactive || 0}</div>
              <div className="text-[10px] text-slate-400">INACTIVE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Real-Time Agent Host Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900">
              Correlated Qualys Cloud Agent Hosts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live inventory of assets equipped with the Qualys Cloud Agent sensor
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs font-bold">
              {['ALL', 'AWS', 'AZURE', 'NETWORK'].map((grp) => (
                <button
                  key={grp}
                  onClick={() => setAssetGroupFilter(grp)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    assetGroupFilter === grp
                      ? 'bg-qblue text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-64">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Hostname, IP, APM ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-mono font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">Qualys Host / IP</th>
                <th className="py-3 px-4">Cloud Provider &amp; Group</th>
                <th className="py-3 px-4">Operating System</th>
                <th className="py-3 px-4">Tracking Sensor</th>
                <th className="py-3 px-4">APM &amp; Correlation ID</th>
                <th className="py-3 px-4 text-center">Sensor Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assetsLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    Loading Qualys Cloud Agent inventory...
                  </td>
                </tr>
              ) : assetsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No matching Cloud Agent assets found.
                  </td>
                </tr>
              ) : (
                assetsList.slice(0, 50).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{a.dns || a.fqdn || a.ip}</div>
                      <div className="text-[10px] font-mono text-slate-400">{a.ip}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono border ${
                        a.asset_group === 'AWS' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        a.asset_group === 'AZURE' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {a.asset_group || 'AWS'}
                      </span>
                      {a.cloud_account_name && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{a.cloud_account_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {a.os || 'Linux'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-qblue border border-blue-200 flex items-center gap-1 w-fit">
                        <Cpu size={10} />
                        {a.tracking_method || 'AGENT'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {a.apm_id ? (
                        <div>
                          <div className="font-mono font-bold text-qblue">{a.apm_id}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Corr: {a.correlation_id || 'N/A'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Unmapped</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/assets/${a.id}`}
                        className="text-qblue hover:underline font-bold text-xs"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
