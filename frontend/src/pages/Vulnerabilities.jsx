import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import SeverityBadge from '../components/SeverityBadge.jsx'
import {
  Download,
  Search,
  Filter,
  ShieldAlert,
  ChevronDown,
  Globe,
  CreditCard,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  Tag,
  Layers,
  Table,
  BarChart3,
  Server,
  Zap,
  Clock,
  Sparkles,
  Building2,
  User,
  Shield,
  RefreshCw,
  XCircle,
} from 'lucide-react'

export default function Vulnerabilities() {
  const [searchParams] = useSearchParams()
  const initialAssetGroup = searchParams.get('asset_group') || ''

  const [viewMode, setViewMode] = useState('powerbi') // 'powerbi' | 'catalog'
  const [catalogData, setCatalogData] = useState({ results: [], total: 0 })
  const [gridData, setGridData] = useState({ results: [], total: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL') // 'ALL' | 'CONFIRMED' | 'POTENTIAL'
  const [vulnStatusFilter, setVulnStatusFilter] = useState('') // 'Active' | 'New' | 'Re-Opened' | 'Fixed'
  const [assetGroup, setAssetGroup] = useState(initialAssetGroup)
  const [apmIdFilter, setApmIdFilter] = useState('')
  const [appOwnerFilter, setAppOwnerFilter] = useState('')
  const [qidFilter, setQidFilter] = useState('')
  const [slaFilter, setSlaFilter] = useState('')
  const [ifOnly, setIfOnly] = useState(false)
  const [pciOnly, setPciOnly] = useState(false)
  const [exceptionOnly, setExceptionOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [showExportModal, setShowExportModal] = useState(false)

  // Summary Metrics for the top cards
  const [summaryMetrics, setSummaryMetrics] = useState({
    total_findings: 0,
    critical_sev5: 0,
    high_sev4: 0,
    med_sev3: 0,
    sla_breached: 0,
    internet_facing: 0,
  })

  async function loadData() {
    setLoading(true)
    try {
      const commonParams = {
        page,
        page_size: pageSize,
      }
      if (severity) commonParams.severity = severity
      if (search) commonParams.search = search
      if (qidFilter) commonParams.vulnerability_id = qidFilter
      if (categoryFilter && categoryFilter !== 'ALL') commonParams.category = categoryFilter
      if (vulnStatusFilter) commonParams.status = vulnStatusFilter
      if (assetGroup) commonParams.asset_group = assetGroup
      if (apmIdFilter) commonParams.apm_id = apmIdFilter
      if (appOwnerFilter) commonParams.app_owner = appOwnerFilter
      if (slaFilter) commonParams.sla_status = slaFilter
      if (ifOnly) commonParams.if_only = true
      if (pciOnly) commonParams.pci_only = true

      if (viewMode === 'powerbi') {
        const gridRes = await api.listDetectionsGrid(commonParams)
        setGridData(gridRes || { results: [], total: 0 })
      } else {
        const catRes = await api.listVulnerabilities({
          ...commonParams,
          cve: search,
          qid: qidFilter,
        })
        setCatalogData(catRes || { results: [], total: 0 })
      }

      // Load general summary stats filtered by APM ID, Asset Group, Owner, and Vuln Status
      const summaryParams = {}
      if (apmIdFilter) summaryParams.apm_id = apmIdFilter
      if (assetGroup) summaryParams.asset_group = assetGroup
      if (appOwnerFilter) summaryParams.app_owner = appOwnerFilter
      if (vulnStatusFilter) summaryParams.status = vulnStatusFilter

      const sum = await api.dashboardSummary(summaryParams).catch(() => null)
      if (sum) {
        setSummaryMetrics({
          total_findings: sum.vulnerabilities_open || 0,
          critical_sev5: sum.critical || 0,
          high_sev4: sum.high || 0,
          med_sev3: sum.medium || 0,
          sla_breached: sum.sla_breached || 0,
          internet_facing: sum.aws_assets || 0,
        })
      }
    } catch (e) {
      console.error('Error loading findings data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [
    viewMode,
    severity,
    categoryFilter,
    vulnStatusFilter,
    search,
    assetGroup,
    apmIdFilter,
    appOwnerFilter,
    qidFilter,
    slaFilter,
    ifOnly,
    pciOnly,
    page,
    pageSize,
  ])

  function resetFilters() {
    setSearch('')
    setSeverity('')
    setCategoryFilter('ALL')
    setVulnStatusFilter('')
    setAssetGroup('')
    setApmIdFilter('')
    setAppOwnerFilter('')
    setQidFilter('')
    setSlaFilter('')
    setIfOnly(false)
    setPciOnly(false)
    setPage(1)
  }

  function buildExportUrl(type) {
    const params = {}
    if (assetGroup) params.asset_group = assetGroup
    if (apmIdFilter) params.apm_id = apmIdFilter
    if (appOwnerFilter) params.app_owner = appOwnerFilter
    if (severity) params.severity = severity
    if (ifOnly) params.if_only = true
    if (pciOnly) params.pci_only = true
    if (exceptionOnly) params.exception_only = true
    if (search) params.search = search

    if (type === 'iasp') {
      return api.iaspExportUrl(params)
    }
    return api.powerBiExportUrl(params)
  }

  const activeCount = viewMode === 'powerbi' ? gridData.total : catalogData.total

  return (
    <div className="px-8 py-8 space-y-6 max-w-[1750px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
              POWERBI ANALYTICS &amp; QUALYS VMDR
            </span>
            <span className="text-xs text-slate-500 font-mono">
              VULNERABILITY ID: <strong className="text-qred">QID</strong> • SLA: 30/90/120/180
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Vulnerability Catalog &amp; Findings Template
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {summaryMetrics.total_findings.toLocaleString()} detected findings correlated across APMs, AWS, Azure, and Network asset groups.
          </p>
        </div>

        {/* Export & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle: PowerBI Table vs Catalog Signatures */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              onClick={() => {
                setViewMode('powerbi')
                setPage(1)
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'powerbi'
                  ? 'bg-qblue text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table size={13} />
              PowerBI Template View
            </button>
            <button
              onClick={() => {
                setViewMode('catalog')
                setPage(1)
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'catalog'
                  ? 'bg-qred text-white shadow-md shadow-red-500/25'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag size={13} />
              Catalog Signatures (QIDs)
            </button>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-red-700 shadow-md shadow-red-500/20 transition-all"
          >
            <Download size={14} strokeWidth={2.5} />
            <span>Export Template (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* TOP 5 METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Findings Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-qblue transition-all">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            TOTAL FINDINGS
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">
            {summaryMetrics.total_findings.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Server size={11} className="text-qblue" />
            Across All Assets
          </div>
        </div>

        {/* Severity 5 Critical Card */}
        <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm hover:border-qred transition-all">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-qred flex items-center justify-between">
            <span>SEV 5 (CRITICAL)</span>
            <span className="px-1.5 py-0.2 rounded bg-red-100 text-[9px] font-bold">30d SLA</span>
          </div>
          <div className="text-2xl font-extrabold text-qred font-display mt-1">
            {summaryMetrics.critical_sev5.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Immediate Remediation</div>
        </div>

        {/* Severity 4 High Card */}
        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm hover:border-orange-400 transition-all">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-600 flex items-center justify-between">
            <span>SEV 4 (HIGH)</span>
            <span className="px-1.5 py-0.2 rounded bg-orange-100 text-[9px] font-bold">90/120d</span>
          </div>
          <div className="text-2xl font-extrabold text-orange-600 font-display mt-1">
            {summaryMetrics.high_sev4.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">90d if IF or PCI</div>
        </div>

        {/* Severity 3 Medium Card */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition-all">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
            <span>SEV 3 (MEDIUM)</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-[9px] font-bold">180d SLA</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 font-display mt-1">
            {summaryMetrics.med_sev3.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Standard Patching</div>
        </div>

        {/* Overdue SLA Breached Card */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm hover:border-rose-400 transition-all">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>SLA BREACHED</span>
            <Zap size={12} className="text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 font-display mt-1">
            {summaryMetrics.sla_breached.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Overdue Action Required</div>
        </div>

        {/* Cloud & APM Correlated Card */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm hover:border-blue-400 transition-all">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-qblue flex items-center justify-between">
            <span>PLATFORMS</span>
            <Layers size={12} className="text-qblue" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">
            AWS • AZ • NET
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Multi-Cloud Ingested</div>
        </div>
      </div>

      {/* Asset Group Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mr-2">
          Asset Group:
        </span>
        {[
          { id: '', label: 'All Asset Groups' },
          { id: 'AWS', label: 'AWS Cloud' },
          { id: 'AZURE', label: 'Azure Subscriptions' },
          { id: 'NETWORK', label: 'Network & Cisco OS' },
        ].map((grp) => (
          <button
            key={grp.id}
            onClick={() => {
              setAssetGroup(grp.id)
              setPage(1)
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              assetGroup === grp.id
                ? 'bg-qblue text-white shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            {grp.label}
          </button>
        ))}
      </div>

      {/* COMPREHENSIVE FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* General Search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
              placeholder="Search Title, CVE, IP, DNS..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Vulnerability ID (QID) Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Tag size={14} className="text-qred shrink-0" />
            <input
              type="text"
              className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400 font-mono"
              placeholder="Vuln ID / QID..."
              value={qidFilter}
              onChange={(e) => {
                setQidFilter(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* APM ID Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Building2 size={14} className="text-qblue shrink-0" />
            <input
              type="text"
              className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400 font-mono"
              placeholder="APM ID (e.g. APM-10023)..."
              value={apmIdFilter}
              onChange={(e) => {
                setApmIdFilter(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* App Owner Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <User size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
              placeholder="IT App Owner..."
              value={appOwnerFilter}
              onChange={(e) => {
                setAppOwnerFilter(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Severity Selector */}
          <div>
            <select
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 rounded-xl outline-none"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Severities</option>
              <option value="5">Severity 5 - Critical (30d SLA)</option>
              <option value="4">Severity 4 - High (90/120d SLA)</option>
              <option value="3">Severity 3 - Medium (180d SLA)</option>
              <option value="2">Severity 2 - Low</option>
              <option value="1">Severity 1 - Info</option>
            </select>
          </div>

          {/* SLA Status Filter */}
          <div>
            <select
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 rounded-xl outline-none"
              value={slaFilter}
              onChange={(e) => {
                setSlaFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All SLA Statuses</option>
              <option value="BREACHED">Breached Overdue</option>
              <option value="WITHIN_SLA">Within SLA Target</option>
            </select>
          </div>

          {/* Vulnerability Status Filter (Active, New, Re-Opened, Fixed) */}
          <div>
            <select
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 rounded-xl outline-none"
              value={vulnStatusFilter}
              onChange={(e) => {
                setVulnStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Vuln Statuses</option>
              <option value="Active">Active</option>
              <option value="New">New</option>
              <option value="Re-Opened">Re-Opened</option>
              <option value="Fixed">Fixed</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Confirmed/Potential & IF/PCI Toggles */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Confirmed vs Potential Types */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => {
                  setCategoryFilter('ALL')
                  setPage(1)
                }}
                className={`px-2.5 py-1 font-bold rounded-md transition-all ${
                  categoryFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => {
                  setCategoryFilter('CONFIRMED')
                  setPage(1)
                }}
                className={`px-2.5 py-1 font-bold rounded-md transition-all flex items-center gap-1 ${
                  categoryFilter === 'CONFIRMED'
                    ? 'bg-qred text-white shadow-sm'
                    : 'text-slate-600 hover:text-qred'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> Confirmed
              </button>
              <button
                onClick={() => {
                  setCategoryFilter('POTENTIAL')
                  setPage(1)
                }}
                className={`px-2.5 py-1 font-bold rounded-md transition-all flex items-center gap-1 ${
                  categoryFilter === 'POTENTIAL'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-amber-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> Potential
              </button>
            </div>

            {/* Checkbox Flags */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 font-medium">
              <input
                type="checkbox"
                checked={ifOnly}
                onChange={(e) => {
                  setIfOnly(e.target.checked)
                  setPage(1)
                }}
                className="accent-qred rounded"
              />
              <span>Internet Facing Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 font-medium">
              <input
                type="checkbox"
                checked={pciOnly}
                onChange={(e) => {
                  setPciOnly(e.target.checked)
                  setPage(1)
                }}
                className="accent-qred rounded"
              />
              <span>PCI Scope Only</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetFilters}
              className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-xs font-semibold"
            >
              <XCircle size={13} /> Clear Filters
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 font-mono font-bold">
              Showing {activeCount.toLocaleString()} {viewMode === 'powerbi' ? 'detections' : 'QIDs'}
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: POWERBI TEMPLATE TABLE (All PowerBI Headers) */}
      {viewMode === 'powerbi' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[680px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-mono font-bold text-slate-600 shadow-sm">
                <tr>
                  <th className="py-3 px-3">Application Name</th>
                  <th className="py-3 px-3">APM ID</th>
                  <th className="py-3 px-3 text-center">Vuln ID (QID)</th>
                  <th className="py-3 px-3">Vulnerability Name</th>
                  <th className="py-3 px-3 text-center">Risk Rating</th>
                  <th className="py-3 px-3">IP Address</th>
                  <th className="py-3 px-3">DNS / Hostname</th>
                  <th className="py-3 px-3">Cloud Account Name</th>
                  <th className="py-3 px-3">CSP</th>
                  <th className="py-3 px-3">App Owner</th>
                  <th className="py-3 px-3 text-center">IF</th>
                  <th className="py-3 px-3 text-center">PCI</th>
                  <th className="py-3 px-3 text-center">SLA Status</th>
                  <th className="py-3 px-3 text-center">Age (Days)</th>
                  <th className="py-3 px-3">CVE ID</th>
                  <th className="py-3 px-3 text-center">QDS</th>
                  <th className="py-3 px-3 text-center">TruRisk</th>
                  <th className="py-3 px-3">Vuln Status</th>
                  <th className="py-3 px-3">First Found</th>
                  <th className="py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gridData.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Application Name */}
                    <td className="py-2.5 px-3 font-bold text-slate-900 max-w-[200px] truncate">
                      {row.application_name}
                    </td>

                    {/* APM ID */}
                    <td className="py-2.5 px-3 font-mono font-bold text-qblue">
                      {row.apm_id}
                    </td>

                    {/* Vulnerability ID is QID */}
                    <td className="py-2.5 px-3 text-center font-mono font-extrabold text-qred">
                      <Link to={`/vulnerabilities/${row.vulnerability_id}`} className="hover:underline">
                        {row.vulnerability_id}
                      </Link>
                    </td>

                    {/* Vulnerability Name */}
                    <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[280px] truncate">
                      <Link to={`/vulnerabilities/${row.vulnerability_id}`} className="hover:text-qred">
                        {row.vulnerability_name}
                      </Link>
                    </td>

                    {/* Risk Rating / Severity */}
                    <td className="py-2.5 px-3 text-center">
                      <SeverityBadge severity={row.severity} />
                    </td>

                    {/* IP */}
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {row.ip}
                    </td>

                    {/* DNS / FQDN */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">
                      {row.dns}
                    </td>

                    {/* Cloud Account Name */}
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {row.cloud_account_name}
                    </td>

                    {/* CSP */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.csp === 'AWS'
                            ? 'bg-orange-50 text-orange-600 border border-orange-200'
                            : row.csp === 'AZURE'
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.csp}
                      </span>
                    </td>

                    {/* App Owner */}
                    <td className="py-2.5 px-3 text-slate-700">
                      {row.app_owner}
                    </td>

                    {/* IF */}
                    <td className="py-2.5 px-3 text-center font-bold">
                      {row.if === 'Yes' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-50 text-qred border border-red-200">
                          YES
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No</span>
                      )}
                    </td>

                    {/* PCI */}
                    <td className="py-2.5 px-3 text-center font-bold">
                      {row.pci === 'Yes' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-800 border border-amber-200">
                          YES
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No</span>
                      )}
                    </td>

                    {/* SLA Status */}
                    <td className="py-2.5 px-3 text-center">
                      {row.sla === 'BREACHED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-qred border border-red-200 inline-flex items-center gap-1">
                          <Zap size={10} /> Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                          Target Ok
                        </span>
                      )}
                    </td>

                    {/* Age */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {row.vulnerability_age}d
                    </td>

                    {/* CVE ID */}
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {row.cve_id}
                    </td>

                    {/* QDS */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                      {row.qds}
                    </td>

                    {/* TruRisk */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-qred">
                      {row.trurisk_score}
                    </td>

                    {/* Vuln Status */}
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                        {row.vulnerability_status}
                      </span>
                    </td>

                    {/* First Found */}
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      {row.first_found_date}
                    </td>

                    {/* Inspect Link */}
                    <td className="py-2.5 px-3">
                      <Link
                        to={`/vulnerabilities/${row.vulnerability_id}`}
                        className="text-qblue hover:underline inline-flex items-center gap-1 font-bold"
                      >
                        Inspect <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {gridData.results.length === 0 && !loading && (
              <div className="py-16 text-center text-slate-400 text-xs">
                No detection records matched your filter criteria.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
            <div className="font-mono">
              Page {page} of {Math.max(1, Math.ceil(gridData.total / pageSize))} (Total: {gridData.total.toLocaleString()} detections)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold"
              >
                Previous
              </button>
              <button
                disabled={page * pageSize >= gridData.total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: VULNERABILITY CATALOG (Aggregated by QID) */}
      {viewMode === 'catalog' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-mono font-bold">
                  <th className="py-3 px-4">QID (Vuln ID)</th>
                  <th className="py-3 px-4">Vulnerability Title</th>
                  <th className="py-3 px-4 text-center">Severity</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">CVE ID</th>
                  <th className="py-3 px-4 text-right">Affected Assets</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalogData.results.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-qred">
                      <Link to={`/vulnerabilities/${v.qid}`} className="hover:underline">
                        {v.qid}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-semibold max-w-md truncate">
                      <Link to={`/vulnerabilities/${v.qid}`} className="hover:text-qred">
                        {v.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <SeverityBadge severity={v.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                        {v.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{v.cve || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                        {v.affected_assets} hosts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/vulnerabilities/${v.qid}`}
                        className="text-slate-700 hover:text-qred hover:underline inline-flex items-center gap-1 text-xs font-mono font-bold"
                      >
                        Inspect <ExternalLink size={12} className="text-qred" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && catalogData.results.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-xs">
                No vulnerabilities matching the filter criteria.
              </div>
            )}
          </div>

          {/* Pagination Controls for Catalog */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
            <div className="font-mono">
              Page {page} of {Math.max(1, Math.ceil(catalogData.total / pageSize))} (Total: {catalogData.total.toLocaleString()} signatures)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold"
              >
                Previous
              </button>
              <button
                disabled={page * pageSize >= catalogData.total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Report Modal */}
      {showExportModal && (
        <ExportFindingsModal
          onClose={() => setShowExportModal(false)}
          assetGroup={assetGroup}
          setAssetGroup={setAssetGroup}
          apmIdFilter={apmIdFilter}
          setApmIdFilter={setApmIdFilter}
          appOwnerFilter={appOwnerFilter}
          setAppOwnerFilter={setAppOwnerFilter}
          severity={severity}
          setSeverity={setSeverity}
          ifOnly={ifOnly}
          setIfOnly={setIfOnly}
          pciOnly={pciOnly}
          setPciOnly={setPciOnly}
          exceptionOnly={exceptionOnly}
          setExceptionOnly={setExceptionOnly}
          buildExportUrl={buildExportUrl}
        />
      )}
    </div>
  )
}

function ExportFindingsModal({
  onClose,
  assetGroup,
  setAssetGroup,
  apmIdFilter,
  setApmIdFilter,
  appOwnerFilter,
  setAppOwnerFilter,
  severity,
  setSeverity,
  ifOnly,
  setIfOnly,
  pciOnly,
  setPciOnly,
  exceptionOnly,
  setExceptionOnly,
  buildExportUrl,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-qred" />
            <h2 className="text-base font-bold text-slate-900 font-display">Export Findings Report</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Select your report format and apply granular filters like APM ID, App Owner, Asset Group, IF/PCI scope, or Exception Approved.
        </p>

        {/* Filter Selection in Modal */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Asset Group</label>
              <select
                value={assetGroup}
                onChange={(e) => setAssetGroup(e.target.value)}
                className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-800"
              >
                <option value="">All Groups (AWS, Azure, Network)</option>
                <option value="AWS">AWS</option>
                <option value="AZURE">Azure</option>
                <option value="NETWORK">Network (Cisco/Routers)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-800"
              >
                <option value="">All Severities</option>
                <option value="5">Severity 5 - Critical</option>
                <option value="4">Severity 4 - High</option>
                <option value="3">Severity 3 - Medium</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">APM ID Filter</label>
              <input
                type="text"
                placeholder="e.g. APM-10023"
                value={apmIdFilter}
                onChange={(e) => setApmIdFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">App Owner Filter</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={appOwnerFilter}
                onChange={(e) => setAppOwnerFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-slate-200 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
              <input
                type="checkbox"
                checked={ifOnly}
                onChange={(e) => setIfOnly(e.target.checked)}
                className="accent-qred rounded"
              />
              <span>Internet Facing Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
              <input
                type="checkbox"
                checked={pciOnly}
                onChange={(e) => setPciOnly(e.target.checked)}
                className="accent-qred rounded"
              />
              <span>PCI Scope Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
              <input
                type="checkbox"
                checked={exceptionOnly}
                onChange={(e) => setExceptionOnly(e.target.checked)}
                className="accent-qred rounded"
              />
              <span>Exception Approved Only</span>
            </label>
          </div>
        </div>

        {/* Two Export Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* IASP Template */}
          <div className="glass-panel p-4 rounded-xl border border-slate-200 hover:border-qred transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="text-[10px] font-mono font-bold text-qred uppercase">
                IASP FORMULA TEMPLATE
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 font-display mt-0.5">IASP Report (.xlsx)</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Standard 53 headers with IP, QDS, ARS, ACS, TruRisk, IF/PCI, APM ID, and Exception details.
              </p>
            </div>
            <a
              href={buildExportUrl('iasp')}
              download
              onClick={onClose}
              className="w-full text-center py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover shadow-red-pill block"
            >
              Export IASP (.xlsx)
            </a>
          </div>

          {/* Power BI Template */}
          <div className="glass-panel p-4 rounded-xl border border-slate-200 hover:border-slate-400 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-700 uppercase">
                BI ANALYTICS SCHEMA
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 font-display mt-0.5">Power BI Report (.xlsx)</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Tailored schema for ingestion directly into Power BI dashboards with Application &amp; Vulnerability ID.
              </p>
            </div>
            <a
              href={buildExportUrl('powerbi')}
              download
              onClick={onClose}
              className="w-full text-center py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 block"
            >
              Export Power BI (.xlsx)
            </a>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
