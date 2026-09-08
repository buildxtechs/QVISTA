import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Upload,
  Layers,
  ShieldAlert,
  Server,
  Globe,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Filter,
  CheckCircle,
  TrendingUp,
  Download,
  Flame,
  ArrowUpDown,
  Zap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Percent,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts'
import { api } from '../lib/api.js'

export default function ApmExplorer() {
  const [apms, setApms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ifOnly, setIfOnly] = useState(false)
  const [pciOnly, setPciOnly] = useState(false)
  const [fixedFilter, setFixedFilter] = useState('all') // 'all', 'has_fixed', 'high_fixed'
  const [sortBy, setSortBy] = useState('fixed_findings') // 'fixed_findings', 'total_findings', 'remediation_rate', 'critical_count'
  const [sortOrder, setSortOrder] = useState('desc')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedApm, setSelectedApm] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 20

  async function loadApms() {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (ifOnly) params.if_only = true
      if (pciOnly) params.pci_only = true
      const data = await api.listApms(params)
      setApms(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApms()
  }, [search, ifOnly, pciOnly])

  // Filter and Sort Data
  const filteredAndSortedApms = useMemo(() => {
    let list = [...apms]

    if (fixedFilter === 'has_fixed') {
      list = list.filter((a) => (a.fixed_findings || 0) > 0)
    } else if (fixedFilter === 'high_fixed') {
      list = list.filter((a) => (a.fixed_findings || 0) >= 30)
    }

    list.sort((a, b) => {
      let valA = a[sortBy] ?? 0
      let valB = b[sortBy] ?? 0
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA
    })

    return list
  }, [apms, fixedFilter, sortBy, sortOrder])

  // Summary Metrics
  const totalFixedCount = useMemo(() => apms.reduce((acc, c) => acc + (c.fixed_findings || 0), 0), [apms])
  const totalOpenCount = useMemo(() => apms.reduce((acc, c) => acc + (c.total_findings || 0), 0), [apms])
  const totalCritFixed = useMemo(() => apms.reduce((acc, c) => acc + (c.crit_fixed || 0), 0), [apms])
  const overallRemediationRate = useMemo(() => {
    const totalLifetime = totalOpenCount + totalFixedCount
    return totalLifetime > 0 ? ((totalFixedCount / totalLifetime) * 100).toFixed(1) : '0.0'
  }, [totalFixedCount, totalOpenCount])

  // Top 10 APMs by Fixed Vulnerabilities for the Interactive Chart
  const topFixedChartData = useMemo(() => {
    return [...apms]
      .filter((a) => (a.fixed_findings || 0) > 0)
      .sort((a, b) => (b.fixed_findings || 0) - (a.fixed_findings || 0))
      .slice(0, 10)
      .map((a) => ({
        apm_id: a.apm_id,
        name: a.application_name?.length > 18 ? a.application_name.slice(0, 16) + '…' : a.application_name,
        fixed: a.fixed_findings,
        open: a.total_findings,
        crit_fixed: a.crit_fixed || 0,
        rate: a.remediation_rate || 0,
      }))
  }, [apms])

  // Export to CSV Feature
  function exportApmCsv() {
    const headers = [
      'APM ID',
      'Application Name',
      'App Owner',
      'Business Owner',
      'Correlation IDs',
      'Environment',
      'Internet Facing',
      'PCI Scope',
      'Total Assets',
      'Fixed Vulnerabilities',
      'Open Vulnerabilities',
      'Critical Open',
      'Critical Fixed',
      'SLA Breaches',
      'Remediation Rate (%)',
    ]

    const rows = filteredAndSortedApms.map((a) => [
      a.apm_id,
      `"${a.application_name || ''}"`,
      `"${a.app_owner || ''}"`,
      `"${a.business_owner || ''}"`,
      `"${(a.correlation_ids || []).join(';')}"`,
      a.environment || 'Production',
      a.internet_facing ? 'YES' : 'NO',
      a.pci_scope ? 'YES' : 'NO',
      a.total_assets,
      a.fixed_findings || 0,
      a.total_findings || 0,
      a.critical_count || 0,
      a.crit_fixed || 0,
      a.sla_breaches || 0,
      `${a.remediation_rate || 0}%`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `qvista_apmid_fixed_vulnerabilities_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedApms.length / pageSize)
  const paginatedApms = filteredAndSortedApms.slice((page - 1) * pageSize, page * pageSize)

  const handleSortToggle = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  async function handleApmClick(apmId) {
    try {
      const detail = await api.apmDetail(apmId)
      setSelectedApm(detail)
      setDetailModalOpen(true)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-50 text-green-700 border border-green-200">
              REMEDIATION INTELLIGENCE
            </span>
            <span className="text-xs text-slate-500 font-mono">APM ID VULNERABILITY SCORECARD</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            APM Explorer &amp; Fixed Vulnerability Posture
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise application inventory correlated with Qualys VMDR detections, fixed finding counts, and remediation rates.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={exportApmCsv}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm transition-all"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export APM Report (CSV)</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover shadow-red-pill transition-all"
          >
            <Upload size={14} strokeWidth={2.5} />
            <span>Upload CMDB Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Core Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tracked APMs */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono">
              TOTAL APM IDs
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-display mt-2">{apms.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span>950+ Enterprise CMDB Applications</span>
          </div>
        </div>

        {/* Fixed Vulnerabilities Count */}
        <div className="glass-panel p-5 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50/40 via-white to-white hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-green-700 font-mono flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-600" /> FIXED VULNERABILITIES
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center border border-green-200">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-green-700 font-display mt-2">
            {totalFixedCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-green-700 font-medium mt-1">
            {totalCritFixed.toLocaleString()} Critical Fixes Verified by Qualys
          </div>
        </div>

        {/* Remediation Velocity Rate */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/30 via-white to-white hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-700 font-mono flex items-center gap-1.5">
              <TrendingUp size={13} /> REMEDIATION RATE
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
              <Percent size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-800 font-display mt-2">
            {overallRemediationRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Fixed vs. Total Lifetime Findings</div>
        </div>

        {/* Active Open Findings */}
        <div className="glass-panel p-5 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/30 via-white to-white hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-qred font-mono flex items-center gap-1.5">
              <AlertTriangle size={13} /> ACTIVE OPEN FINDINGS
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-qred flex items-center justify-center border border-red-200">
              <Flame size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-qred font-display mt-2">
            {totalOpenCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pending remediation across all APMs</div>
        </div>
      </div>

      {/* Top 10 APMs by Fixed Vulnerabilities Chart Section */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider">
                Top 10 APMs with Highest Fixed Vulnerabilities
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of resolved security detections across highest-performing enterprise applications.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-green-50 text-green-700 border border-green-200 self-start md:self-auto">
            Qualys VMDR Verified Fixes
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topFixedChartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="apm_id"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-800 space-y-1">
                      <div className="font-bold text-green-400 font-mono">{data.apm_id}</div>
                      <div className="text-slate-200">{data.name}</div>
                      <div className="pt-1.5 border-t border-slate-800 text-[11px] space-y-0.5">
                        <div className="text-green-400 font-bold">✓ Fixed Vulns: {data.fixed}</div>
                        <div className="text-slate-300">⚡ Open Vulns: {data.open}</div>
                        <div className="text-blue-400">📈 Remediation Rate: {data.rate}%</div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="fixed" radius={[6, 6, 0, 0]}>
                {topFixedChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#16A34A' : '#22C55E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter, Sort & Search Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 rounded-full text-xs w-full sm:w-80 shadow-inner">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
            placeholder="Search APM ID, App Name, Owner, 5-digit ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {/* Filters & Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Fixed Status Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
            <button
              onClick={() => {
                setFixedFilter('all')
                setPage(1)
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                fixedFilter === 'all' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All APMs ({apms.length})
            </button>
            <button
              onClick={() => {
                setFixedFilter('has_fixed')
                setPage(1)
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                fixedFilter === 'has_fixed' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:text-green-700'
              }`}
            >
              <CheckCircle size={12} />
              <span>With Fixed Vulns</span>
            </button>
            <button
              onClick={() => {
                setFixedFilter('high_fixed')
                setPage(1)
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                fixedFilter === 'high_fixed' ? 'bg-green-700 text-white shadow-sm' : 'text-slate-500 hover:text-green-800'
              }`}
            >
              Top Fixes (30+)
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Scope Checkboxes */}
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
            <input
              type="checkbox"
              checked={ifOnly}
              onChange={(e) => {
                setIfOnly(e.target.checked)
                setPage(1)
              }}
              className="accent-qred rounded"
            />
            <span className="font-medium">Internet Facing</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
            <input
              type="checkbox"
              checked={pciOnly}
              onChange={(e) => {
                setPciOnly(e.target.checked)
                setPage(1)
              }}
              className="accent-qred rounded"
            />
            <span className="font-medium">PCI Scope</span>
          </label>
        </div>
      </div>

      {/* APM Fixed & Open Vulnerability Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-mono font-bold">
                <th
                  onClick={() => handleSortToggle('apm_id')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1.5">
                    <span>APM ID &amp; Application Name</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4">Owners &amp; Correlation ID</th>
                <th className="py-3.5 px-3 text-center">Scopes</th>
                <th
                  onClick={() => handleSortToggle('total_assets')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Assets</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('fixed_findings')}
                  className="py-3.5 px-4 text-center cursor-pointer bg-green-50/60 text-green-800 border-x border-green-100 hover:text-green-900"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle size={13} className="text-green-600" />
                    <span>FIXED VULNS</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('remediation_rate')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Remediation %</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('total_findings')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Open Vulns</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('critical_count')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Critical Open</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('sla_breaches')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>SLA Breaches</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedApms.map((a) => (
                <tr key={a.apm_id} className="hover:bg-slate-50/80 transition-colors">
                  {/* APM ID & Name */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleApmClick(a.apm_id)}
                      className="text-left group block"
                    >
                      <div className="font-mono font-bold text-qred group-hover:underline flex items-center gap-1.5">
                        <span>{a.apm_id}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-slate-900 font-bold text-xs mt-0.5">
                        {a.application_name}
                      </div>
                      <div className="text-[10px] text-slate-400">{a.organization || 'Global BU'}</div>
                    </button>
                  </td>

                  {/* Owners & Correlation ID */}
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 font-medium">
                      <span className="text-[10px] text-slate-400">Biz: </span>
                      {a.business_owner}
                    </div>
                    {a.correlation_ids && a.correlation_ids.length > 0 ? (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-mono font-bold">
                          ID: {a.correlation_ids.join(', ')}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">—</div>
                    )}
                  </td>

                  {/* Scopes */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {a.internet_facing ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-qred border border-red-200">
                          IF
                        </span>
                      ) : null}
                      {a.pci_scope ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                          PCI
                        </span>
                      ) : null}
                      {!a.internet_facing && !a.pci_scope && (
                        <span className="text-slate-300 text-[10px]">Internal</span>
                      )}
                    </div>
                  </td>

                  {/* Total Assets */}
                  <td className="py-3.5 px-3 text-center font-mono text-slate-900 font-bold">
                    {a.total_assets}
                  </td>

                  {/* FIXED VULNS COUNT - HIGHLIGHTED */}
                  <td className="py-3.5 px-4 text-center bg-green-50/40 border-x border-green-100">
                    <div className="flex flex-col items-center justify-center">
                      <span className="px-2.5 py-1 rounded-full font-mono text-xs font-extrabold bg-green-100 text-green-800 border border-green-300 shadow-sm">
                        {a.fixed_findings || 0} Fixed
                      </span>
                      {(a.crit_fixed || 0) > 0 && (
                        <span className="text-[9px] text-green-700 font-bold mt-0.5">
                          {a.crit_fixed} Critical Fixes
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Remediation Rate */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {a.remediation_rate || 0}%
                      </span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${Math.min(a.remediation_rate || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Open Findings */}
                  <td className="py-3.5 px-3 text-center font-mono text-slate-700 font-medium">
                    {a.total_findings}
                  </td>

                  {/* Critical Count */}
                  <td className="py-3.5 px-3 text-center">
                    {a.critical_count > 0 ? (
                      <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-red-50 text-qred border border-red-200">
                        {a.critical_count}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">0</span>
                    )}
                  </td>

                  {/* SLA Breaches */}
                  <td className="py-3.5 px-3 text-center">
                    {a.sla_breaches > 0 ? (
                      <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {a.sla_breaches}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">0</span>
                    )}
                  </td>

                  {/* Action Button */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleApmClick(a.apm_id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-qred hover:text-white text-slate-700 text-xs font-bold transition-all shadow-sm"
                    >
                      View Posture
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedApms.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No enterprise APM records found matching your filters.
            </div>
          )}
        </div>

        {/* Pagination Toolbar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{paginatedApms.length}</strong> of{' '}
            <strong className="text-slate-900">{filteredAndSortedApms.length}</strong> APMs
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold"
            >
              Previous
            </button>
            <span className="font-mono text-xs">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Upload CMDB Modal */}
      {isUploadOpen && (
        <CmdbUploadModal
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => {
            setIsUploadOpen(false)
            loadApms()
          }}
        />
      )}

      {/* APM Drill-Down Detail Modal */}
      {detailModalOpen && selectedApm && (
        <ApmDetailModal
          apm={selectedApm}
          onClose={() => {
            setDetailModalOpen(false)
            setSelectedApm(null)
          }}
        />
      )}
    </div>
  )
}

function CmdbUploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const res = await api.uploadCmdb(file)
      setResult(res)
      setTimeout(() => {
        onSuccess()
      }, 1800)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-qred" />
            <h2 className="text-base font-bold text-slate-900 font-display">Upload CMDB Spreadsheet</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Upload an Excel (.xlsx) or CSV file with <strong>APM ID</strong>, <strong>Application Name</strong>, 
          <strong>App Owner</strong>, <strong>Business Owner</strong>, <strong>5-digit Correlation ID</strong>, 
          and <strong>Internet Facing (IF) / PCI</strong> indicators.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 hover:border-qred rounded-2xl p-6 text-center cursor-pointer bg-slate-50 transition-all">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-qred file:text-white hover:file:bg-qred-hover cursor-pointer"
            />
          </div>

          {file && (
            <div className="text-xs font-mono text-slate-800 flex items-center gap-1.5">
              <span>Selected: {file.name}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-slate-800 text-xs flex items-center gap-2">
              <XCircle size={15} className="text-qred shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>
                Processed {result.valid_records} CMDB records ({result.assets_correlated} assets correlated).
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover disabled:opacity-50 transition-all shadow-red-pill"
            >
              {uploading ? 'Ingesting CMDB...' : 'Ingest Spreadsheet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ApmDetailModal({ apm, onClose }) {
  const summary = apm.summary || {
    total_assets: apm.assets?.length || 0,
    open_findings: 0,
    fixed_findings: 0,
    critical_open: 0,
    critical_fixed: 0,
    remediation_rate: 0,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-qred font-extrabold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                {apm.apm_id}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                {apm.organization || 'Global'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 font-display mt-1">
              {apm.application_name}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        {/* Posture Scorecard Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-green-50/70 p-3.5 rounded-xl border border-green-200">
            <div className="text-green-700 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
              <CheckCircle size={12} /> Fixed Findings
            </div>
            <div className="text-2xl font-extrabold text-green-800 font-display mt-1">
              {summary.fixed_findings}
            </div>
            <div className="text-[10px] text-green-700 mt-0.5">
              {summary.critical_fixed} Critical Fixed
            </div>
          </div>

          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
            <div className="text-blue-700 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
              <Percent size={12} /> Remediation Rate
            </div>
            <div className="text-2xl font-extrabold text-blue-800 font-display mt-1">
              {summary.remediation_rate}%
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">Lifetime Resolved</div>
          </div>

          <div className="bg-red-50/70 p-3.5 rounded-xl border border-red-200">
            <div className="text-qred text-[10px] font-mono font-bold uppercase flex items-center gap-1">
              <AlertTriangle size={12} /> Active Open
            </div>
            <div className="text-2xl font-extrabold text-qred font-display mt-1">
              {summary.open_findings}
            </div>
            <div className="text-[10px] text-qred mt-0.5">{summary.critical_open} Critical Open</div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="text-slate-500 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
              <Server size={12} /> Host Sensors
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">
              {summary.total_assets}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Correlated Qualys Hosts</div>
          </div>
        </div>

        {/* Ownership & CMDB Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <div className="text-slate-500 text-[10px]">App Owner</div>
            <div className="text-slate-900 font-bold mt-0.5">{apm.app_owner || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">Business Owner</div>
            <div className="text-slate-900 font-bold mt-0.5">{apm.business_owner || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">Environment</div>
            <div className="text-slate-900 font-bold mt-0.5">{apm.environment || 'Production'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">Correlation IDs</div>
            <div className="text-qred font-mono font-bold mt-0.5">
              {apm.correlation_ids && apm.correlation_ids.length > 0 ? apm.correlation_ids.join(', ') : '—'}
            </div>
          </div>
        </div>

        {/* Correlated Host Assets Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Server size={14} className="text-qred" /> Correlated Host Assets ({apm.assets?.length || 0})
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-mono font-bold">
                <tr>
                  <th className="py-2.5 px-3">Hostname</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Asset Group</th>
                  <th className="py-2.5 px-3">OS</th>
                  <th className="py-2.5 px-3 text-center bg-green-50/50 text-green-800">Fixed Vulns</th>
                  <th className="py-2.5 px-3 text-center">Open Vulns</th>
                  <th className="py-2.5 px-3 text-center">Critical</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(apm.assets || []).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <Link to={`/assets/${a.id}`} className="hover:text-qred">
                        {a.hostname}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{a.ip}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-800">
                        {a.asset_group || a.cloud_provider || 'NETWORK'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{a.os || '—'}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-extrabold text-green-700 bg-green-50/30">
                      {a.fixed_findings || 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-900 font-bold">{a.open_findings}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-qred font-extrabold">{a.critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!apm.assets || apm.assets.length === 0) && (
              <p className="text-xs text-slate-400 py-6 text-center">No host assets correlated yet.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
