import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  RefreshCw,
  Download,
  Server,
  Shield,
  AlertTriangle,
  Zap,
  Network,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  Globe,
  CreditCard,
  Layers,
  Cloud,
  CheckCircle2,
  Radio,
  Flame,
  ArrowRight,
  GitMerge,
  Sparkles,
  X,
} from 'lucide-react'
import { api } from '../lib/api.js'
import KpiCard from '../components/KpiCard.jsx'
import CloudComparisonHub from '../components/CloudComparisonHub.jsx'
import AddInventoryModal from '../components/AddInventoryModal.jsx'
import GeminiCopilotModal from '../components/GeminiCopilotModal.jsx'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [aging, setAging] = useState([])
  const [trend, setTrend] = useState([])
  const [topApps, setTopApps] = useState([])
  const [topQids, setTopQids] = useState([])
  const [welcomeNote, setWelcomeNote] = useState(null)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState(null)
  const [error, setError] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [trendRange, setTrendRange] = useState('30')
  const [agingSeverity, setAgingSeverity] = useState('all')

  async function loadAll() {
    try {
      const [s, a, t, apps, qids, note] = await Promise.all([
        api.dashboardSummary(),
        api.dashboardAging(),
        api.dashboardTrend(),
        api.topApplications(),
        api.topCriticalQids(),
        api.getWelcomeNote('IVM Team').catch(() => null),
      ])
      setSummary(s)
      setAging(a)
      setTrend(t)
      setTopApps(apps)
      setTopQids(qids)
      if (note && note.welcome_note) setWelcomeNote(note.welcome_note)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      await api.triggerSync()
      setTimeout(() => {
        loadAll()
        setSyncing(false)
      }, 1500)
    } catch (e) {
      setError(e.message)
      setSyncing(false)
    }
  }

  async function handleMatchPostScan() {
    setMatching(true)
    setError(null)
    try {
      const res = await api.matchPostScan()
      setMatchResult(res)
      await loadAll()
    } catch (e) {
      setError(e.message)
    } finally {
      setMatching(false)
    }
  }

  const AGING_BAR_COLORS = ['#ED1C24', '#F97316', '#F59E0B', '#E11D48', '#BE123C', '#991B1B']

  const displaySummary = summary || {
    assets: 0,
    vulnerabilities_open: 0,
    critical: 0,
    sla_breached: 0,
    cloud_unmatched: 0,
    cloud_matched: 0,
  }

  const displayTrend = trend || []
  const displayAging = aging || []

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Hero / Greeting Section for IVM Team */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-qred animate-pulse" />
            <span className="text-xs font-mono text-qred tracking-wider uppercase font-bold flex items-center gap-1.5">
              <Radio size={13} /> Qualys VMDR Threat Intelligence Live
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Welcome back, IVM Team.
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-sans">
            Live vulnerability posture, AWS &amp; Azure cloud assets in Qualys, and CMDB inventory correlation.
          </p>
        </div>

        {/* Hero Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Ask AI Doubts Button */}
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-qblue hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 group"
          >
            <Sparkles size={15} className="group-hover:rotate-12 transition-transform text-yellow-300" />
            <span>Ask Gemini AI Copilot</span>
          </button>

          {/* Post-Scan Match with AWS, Azure & CMDB Button */}
          <button
            onClick={handleMatchPostScan}
            disabled={matching}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-blue-50/50 border border-slate-300 hover:border-qblue rounded-xl transition-all shadow-sm group"
          >
            <GitMerge size={15} className={matching ? 'animate-spin text-qblue' : 'text-qblue group-hover:rotate-12 transition-transform'} />
            <span>{matching ? 'Matching Cloud & CMDB...' : 'Match AWS, Azure & CMDB'}</span>
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-red-50/50 border border-slate-300 hover:border-qred rounded-xl transition-all shadow-sm"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin text-qred' : 'text-qred'} />
            <span>{syncing ? 'Syncing VMDR...' : 'Sync Now'}</span>
          </button>

          {/* Export Report Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-red-700 shadow-md shadow-red-500/20 transition-all"
            >
              <Download size={14} strokeWidth={2.5} />
              <span>Export Reports</span>
              <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 text-xs z-50 animate-fadeIn space-y-1">
                <a
                  href={api.iaspExportUrl()}
                  download
                  onClick={() => setShowExportMenu(false)}
                  className="block px-3 py-2 text-slate-800 hover:text-qred hover:bg-red-50 rounded-lg transition-colors font-bold"
                >
                  IASP Findings Report (.xlsx)
                </a>
                <a
                  href={api.powerBiExportUrl()}
                  download
                  onClick={() => setShowExportMenu(false)}
                  className="block px-3 py-2 text-slate-800 hover:text-qred hover:bg-red-50 rounded-lg transition-colors font-bold"
                >
                  Power BI Analytics Schema (.xlsx)
                </a>
                <div className="border-t border-slate-100 my-1" />
                <a
                  href={api.reportUrl('unmatched-assets.xlsx')}
                  download
                  onClick={() => setShowExportMenu(false)}
                  className="block px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors text-[11px]"
                >
                  Unmatched Shadow Assets (.xlsx)
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Copilot Morning Briefing & Welcome Note Card */}
      {welcomeNote && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 border border-blue-200 shadow-sm flex items-start justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-qblue text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 mt-0.5">
              <Sparkles size={16} className="text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-qblue uppercase tracking-wider">
                  Gemini Security Briefing
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-800 mt-0.5 font-medium leading-relaxed">
                {welcomeNote}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCopilotOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span>Resolve Doubts</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {error && !error.includes('No active Qualys') && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-slate-800 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-qred shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* POST-SCAN MATCH CORRELATION RESULTS MODAL / BANNER */}
      {matchResult && (
        <div className="p-6 bg-white border border-slate-300 rounded-2xl shadow-lg relative animate-fadeIn space-y-5">
          <button
            onClick={() => setMatchResult(null)}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-qred flex items-center justify-center border border-red-200">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 font-display">
                Post-Scan Correlation &amp; Matching Summary
              </h2>
              <p className="text-xs text-slate-500">
                Matched Qualys scanned telemetry with AWS accounts, Azure subscriptions, and enterprise CMDB applications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* AWS Breakdown Box */}
            <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between text-xs font-bold text-orange-700 font-mono mb-1">
                <span>AWS INVENTORY</span>
                <Cloud size={15} />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-display">
                {matchResult.aws_correlation?.matched} / {matchResult.aws_correlation?.total_instances}
              </div>
              <div className="text-xs text-slate-600 mt-1 flex justify-between items-center">
                <span>Coverage: <strong className="text-orange-700">{matchResult.aws_correlation?.coverage_pct}%</strong></span>
                <span className="text-[11px] text-orange-600 font-mono">{matchResult.aws_correlation?.shadow_unmatched} Shadow</span>
              </div>
            </div>

            {/* Azure Breakdown Box */}
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 font-mono mb-1">
                <span>AZURE INVENTORY</span>
                <Cloud size={15} />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-display">
                {matchResult.azure_correlation?.matched} / {matchResult.azure_correlation?.total_instances}
              </div>
              <div className="text-xs text-slate-600 mt-1 flex justify-between items-center">
                <span>Coverage: <strong className="text-blue-700">{matchResult.azure_correlation?.coverage_pct}%</strong></span>
                <span className="text-[11px] text-blue-600 font-mono">{matchResult.azure_correlation?.shadow_unmatched} Shadow</span>
              </div>
            </div>

            {/* CMDB Correlation Box */}
            <div className="p-4 bg-red-50/60 rounded-xl border border-red-200">
              <div className="flex items-center justify-between text-xs font-bold text-qred font-mono mb-1">
                <span>CMDB ENTITIES</span>
                <Layers size={15} />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-display">
                {matchResult.cmdb_correlation?.unique_apms} <span className="text-xs font-normal text-slate-500 font-sans">APMs</span>
              </div>
              <div className="text-xs text-slate-600 mt-1 flex justify-between items-center">
                <span>IF Hosts: <strong className="text-qred">{matchResult.cmdb_correlation?.internet_facing_assets}</strong></span>
                <span>PCI Hosts: <strong className="text-slate-800">{matchResult.cmdb_correlation?.pci_scope_assets}</strong></span>
              </div>
            </div>

            {/* Asset Groups Assigned */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 font-mono mb-1">
                <span>ASSET GROUPS</span>
                <Server size={15} />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-display">
                {matchResult.assets_total} <span className="text-xs font-normal text-slate-500 font-sans">Total</span>
              </div>
              <div className="text-xs text-slate-600 mt-1 flex justify-between items-center font-mono">
                <span className="text-orange-600">AWS: {matchResult.asset_groups?.aws}</span>
                <span className="text-blue-600">AZ: {matchResult.asset_groups?.azure}</span>
                <span className="text-qred">Net: {matchResult.asset_groups?.network}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THREE CORE ASSET GROUPS CARDS (AWS, AZURE, NETWORK) */}
      <div>
        <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 font-mono mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-qblue" />
          CORE ASSET GROUPS &amp; CORRELATION BREAKDOWN
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* AWS ASSET GROUP */}
          <Link
            to="/assets?cloud=AWS"
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-qblue transition-all group block relative overflow-hidden shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700">
                AWS ASSET GROUP
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 group-hover:scale-110 transition-transform">
                <Cloud size={18} />
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">Validated AWS Inventory &amp; 5-digit Correlation IDs</div>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-extrabold text-slate-900 font-display">
                {displaySummary.aws_assets || 0}
              </span>
              <span className="text-xs text-orange-600 font-mono font-bold">AWS Cloud Hosts</span>
            </div>
          </Link>

          {/* AZURE ASSET GROUP */}
          <Link
            to="/assets?cloud=AZURE"
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-qblue transition-all group block relative overflow-hidden shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700">
                AZURE ASSET GROUP
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-qblue flex items-center justify-center border border-blue-200 group-hover:scale-110 transition-transform">
                <Cloud size={18} />
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">Validated Azure Subscriptions &amp; Correlation IDs</div>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-extrabold text-slate-900 font-display">
                {displaySummary.azure_assets || 0}
              </span>
              <span className="text-xs text-qblue font-mono font-bold">Azure VM Instances</span>
            </div>
          </Link>

          {/* NETWORK ASSET GROUP */}
          <Link
            to="/assets?cloud=NETWORK"
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-qred transition-all group block relative overflow-hidden shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700">
                NETWORK &amp; CISCO GROUP
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-qred flex items-center justify-center border border-red-200 group-hover:scale-110 transition-transform">
                <Network size={18} />
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">Auto-classified Cisco IOS, ASA, Routers &amp; Network OS</div>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-extrabold text-slate-900 font-display">
                {displaySummary.network_assets || 0}
              </span>
              <span className="text-xs text-qred font-mono font-bold">Network Appliances</span>
            </div>
          </Link>
        </div>
      </div>

      {/* TOP 5 KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="TOTAL ASSETS"
          value={displaySummary.assets}
          icon={Server}
          theme="cyan"
          trendText="Unified VMDR inventory"
          trendDirection="up"
          trendTone="green"
        />

        <KpiCard
          label="OPEN FINDINGS"
          value={displaySummary.vulnerabilities_open}
          icon={Shield}
          theme="red"
          trendText="Active vulnerabilities"
          trendDirection="down"
          trendTone="green"
        />

        <KpiCard
          label="CRITICAL (SEV 5)"
          value={displaySummary.critical}
          icon={AlertTriangle}
          theme="critical"
          trendText="Immediate remediation"
          trendDirection="down"
          trendTone="red"
        />

        <KpiCard
          label="SLA BREACHED"
          value={displaySummary.sla_breached}
          icon={Zap}
          theme="red"
          trendText="Overdue remediation"
          trendDirection="up"
          trendTone="red"
        />

        <KpiCard
          label="SHADOW ASSETS"
          value={displaySummary.cloud_unmatched}
          icon={Network}
          theme="cyan"
          trendText="Cloud without agent"
          trendDirection="down"
          trendTone="green"
        />
      </div>

      {/* DETECTION VELOCITY & RISK DISTRIBUTION CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Velocity */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-qred font-mono">
                DETECTION VELOCITY
              </div>
              <h3 className="text-base font-extrabold text-slate-900 font-display mt-0.5">
                Vulnerability Trend
              </h3>
            </div>
            <select
              value={trendRange}
              onChange={(e) => setTrendRange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1 outline-none"
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="redGradientLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ED1C24" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ED1C24" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(d) => (d ? d.slice(5) : '')}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="new_findings"
                  stroke="#ED1C24"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#redGradientLight)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vulnerability Aging */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-qred font-mono">
                RISK DISTRIBUTION
              </div>
              <h3 className="text-base font-extrabold text-slate-900 font-display mt-0.5">
                Vulnerability Aging
              </h3>
            </div>
            <select
              value={agingSeverity}
              onChange={(e) => setAgingSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1 outline-none"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical only (Sev 5)</option>
              <option value="high">High only (Sev 4)</option>
            </select>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayAging} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {displayAging.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={AGING_BAR_COLORS[index % AGING_BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CLOUD INVENTORY COMPARISON & MULTI-ACCOUNT BREAKDOWN HUB */}
      <CloudComparisonHub
        onAddInventory={() => setIsAddModalOpen(true)}
        onRefresh={loadAll}
      />

      {/* TOP CRITICAL QIDS & TOP VULNERABLE APPLICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-qred" />
              <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
                Top Critical QIDs
              </h3>
            </div>
            <Link to="/vulnerabilities" className="text-xs text-qred hover:underline flex items-center gap-1 font-bold">
              Catalog <ExternalLink size={12} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {topQids.map((q) => (
              <div key={q.qid} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="truncate">
                  <span className="font-mono font-bold text-qred mr-2">QID {q.qid}</span>
                  <span className="text-slate-800 font-medium truncate">{q.title}</span>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded font-mono text-[11px] bg-red-50 text-qred border border-red-200 font-bold">
                  {q.affected_assets} hosts
                </span>
              </div>
            ))}
            {topQids.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No critical QIDs detected.</p>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Network size={16} className="text-qred" />
              <h3 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider">
                Top Vulnerable Applications
              </h3>
            </div>
            <Link to="/apms" className="text-xs text-qred hover:underline flex items-center gap-1 font-bold">
              APM Explorer <ExternalLink size={12} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {topApps.map((a) => (
              <div key={a.application} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-800 font-medium">{a.application}</span>
                <span className="shrink-0 px-2 py-0.5 rounded font-mono text-[11px] bg-red-50 text-qred border border-red-200 font-bold">
                  {a.open_findings} findings
                </span>
              </div>
            ))}
            {topApps.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No correlated applications yet.</p>
            )}
          </div>
        </div>
      </div>

      <AddInventoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadAll}
      />

      <GeminiCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  )
}

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl font-mono">
        <div className="text-slate-400 text-[10px] mb-1">{label}</div>
        <div className="text-slate-900 font-bold">
          {payload[0].value.toLocaleString()} <span className="text-qred">active findings</span>
        </div>
      </div>
    )
  }
  return null
}

function CustomBarTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl font-mono">
        <div className="text-slate-400 text-[10px] mb-1">Age: {label}</div>
        <div className="text-slate-900 font-bold">
          {payload[0].value.toLocaleString()} <span className="text-qred">vulnerabilities</span>
        </div>
      </div>
    )
  }
  return null
}
