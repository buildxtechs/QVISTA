import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Cloud,
  Server,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Search,
  ExternalLink,
  Layers,
  CheckCircle2,
  XCircle,
  X,
  Building2,
  User,
  Shield,
  CheckCircle,
  Clock,
  Sparkles,
  GitCompare,
} from 'lucide-react'
import { api } from '../lib/api.js'

export default function CloudComparisonHub({ onAddInventory, onRefresh }) {
  const [activeTab, setActiveTab] = useState('aws') // 'aws' | 'azure' | 'network' | 'matrix'
  const [comparison, setComparison] = useState(null)
  const [matrixData, setMatrixData] = useState({ results: [], total: 0 })
  const [matrixStatus, setMatrixStatus] = useState('ALL')
  const [matrixSearch, setMatrixSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [rematching, setRematching] = useState(false)
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('')
  const [selectedApmModal, setSelectedApmModal] = useState(null) // holds selected account/sub/net object with apm_details
  const [selectedApmSearch, setSelectedApmSearch] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const comp = await api.cloudComparison()
      setComparison(comp)

      const matrix = await api.cloudMatrix({
        provider: activeTab === 'aws' ? 'AWS' : activeTab === 'azure' ? 'AZURE' : 'ALL',
        match_status: matrixStatus,
        search: matrixSearch,
        account: selectedAccountFilter || undefined,
        page_size: 20,
      })
      setMatrixData(matrix)
    } catch (err) {
      console.error('Error loading cloud comparison:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab, matrixStatus, matrixSearch, selectedAccountFilter])

  async function handleRematch() {
    setRematching(true)
    try {
      await api.rematch()
      await loadData()
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Rematch error:', err)
    } finally {
      setRematching(false)
    }
  }

  const awsSummary = comparison?.aws_summary || {
    total_instances: 0,
    matched: 0,
    unmatched: 0,
    account_count: 0,
    coverage_pct: 0,
    open_vulns_5_4_3: 0,
    fixed_vulns: 0,
  }
  const azureSummary = comparison?.azure_summary || {
    total_instances: 0,
    matched: 0,
    unmatched: 0,
    subscription_count: 0,
    coverage_pct: 0,
    open_vulns_5_4_3: 0,
    fixed_vulns: 0,
  }
  const networkSummary = comparison?.network_summary || {
    group_name: 'Network & Cisco Appliances',
    asset_count: 0,
    critical_vulns: 0,
    high_vulns: 0,
    med_vulns: 0,
    fixed_vulns: 0,
    total_open_5_4_3: 0,
    apm_details: [],
  }
  const awsAccounts = comparison?.aws_accounts || []
  const azureSubscriptions = comparison?.azure_subscriptions || []

  // Filtered APM Details in Modal
  const modalApmList = (selectedApmModal?.apm_details || []).filter((apm) => {
    if (!selectedApmSearch) return true
    const term = selectedApmSearch.toLowerCase()
    return (
      (apm.apm_id && apm.apm_id.toLowerCase().includes(term)) ||
      (apm.app_name && apm.app_name.toLowerCase().includes(term)) ||
      (apm.app_owner && apm.app_owner.toLowerCase().includes(term)) ||
      (apm.business_owner && apm.business_owner.toLowerCase().includes(term)) ||
      (apm.correlation_id && apm.correlation_id.toLowerCase().includes(term))
    )
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-100 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-qblue border border-blue-200">
              <Cloud size={18} />
            </span>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Assets Dashboard &amp; Platform Correlation
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Qualys scanned vulnerabilities &amp; assets correlated with AWS &amp; Azure inventories and CMDB (5-digit IDs, APM IDs, owners, Sev 5/4/3 &amp; Fixed counts).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRematch}
            disabled={rematching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-qblue rounded-xl transition-colors shadow-sm"
          >
            <RefreshCw size={13} className={rematching ? 'animate-spin text-qblue' : 'text-slate-600'} />
            {rematching ? 'Correlating...' : 'Match IPs with Inv'}
          </button>

          <button
            onClick={onAddInventory}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-qblue text-white hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Cloud Inventory
          </button>
        </div>
      </div>

      {/* Cloud & Network Summary Comparison Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50/70 p-4 border-b border-slate-200 text-xs">
        {/* AWS Summary */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold shadow-sm">
            AWS
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <span>AWS ({awsSummary.account_count} Accounts)</span>
              <span className="text-orange-600 font-mono font-bold">{awsSummary.coverage_pct}% Covered</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-display">
              {awsSummary.total_instances} <span className="text-xs font-normal text-slate-500 font-sans">EC2 Instances</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1 font-mono">
              <span className="text-qred font-bold">{awsSummary.open_vulns_5_4_3 || 0} Open (5,4,3)</span>
              <span className="text-green-600 font-bold">{awsSummary.fixed_vulns || 0} Fixed</span>
            </div>
          </div>
        </div>

        {/* Azure Summary */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-qblue font-bold shadow-sm">
            AZ
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <span>Azure ({azureSummary.subscription_count} Subs)</span>
              <span className="text-qblue font-mono font-bold">{azureSummary.coverage_pct}% Covered</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-display">
              {azureSummary.total_instances} <span className="text-xs font-normal text-slate-500 font-sans">VM Instances</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1 font-mono">
              <span className="text-qred font-bold">{azureSummary.open_vulns_5_4_3 || 0} Open (5,4,3)</span>
              <span className="text-green-600 font-bold">{azureSummary.fixed_vulns || 0} Fixed</span>
            </div>
          </div>
        </div>

        {/* Network & Cisco OS Summary */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-qred font-bold shadow-sm">
            NET
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <span>Network &amp; Cisco</span>
              <span className="text-qred font-mono font-bold">100% Monitored</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-display">
              {networkSummary.asset_count} <span className="text-xs font-normal text-slate-500 font-sans">Appliances</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1 font-mono">
              <span className="text-qred font-bold">{networkSummary.total_open_5_4_3 || 0} Open (5,4,3)</span>
              <span className="text-green-600 font-bold">{networkSummary.fixed_vulns || 0} Fixed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between px-6 pt-4 border-b border-slate-200 bg-white">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('aws')
              setSelectedAccountFilter('')
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === 'aws'
                ? 'bg-orange-50 text-orange-600 border border-orange-200 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            AWS Accounts ({awsAccounts.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('azure')
              setSelectedAccountFilter('')
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === 'azure'
                ? 'bg-blue-50 text-qblue border border-blue-200 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Azure Subscriptions ({azureSubscriptions.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('network')
              setSelectedAccountFilter('')
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === 'network'
                ? 'bg-red-50 text-qred border border-red-200 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Network Appliances ({networkSummary.asset_count})
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-slate-100 text-slate-900 border border-slate-300 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers size={14} />
            Discrepancy Matrix ({matrixData.total})
          </button>
        </div>

        {selectedAccountFilter && (
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
            <span>
              Filtered by: <strong className="text-qblue">{selectedAccountFilter}</strong>
            </span>
            <button
              onClick={() => setSelectedAccountFilter('')}
              className="text-slate-400 hover:text-red-600 p-0.5"
            >
              <XCircle size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: AWS Accounts Breakdown */}
      {activeTab === 'aws' && (
        <div className="p-6 space-y-6 bg-slate-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {awsAccounts.map((acct) => (
              <div
                key={acct.raw_key}
                className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-orange-400 p-4 rounded-2xl transition-all flex flex-col justify-between shadow-sm hover:shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        {acct.account_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        ID: {acct.account_id}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-50 text-orange-600 border border-orange-200">
                      {acct.coverage_pct}% Covered
                    </span>
                  </div>

                  {/* Coverage Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 my-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-green-500 h-2 rounded-full"
                      style={{ width: `${acct.coverage_pct}%` }}
                    />
                  </div>

                  {/* Asset Counts Strip */}
                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50 rounded-xl border border-slate-100 my-2">
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Total Assets</div>
                      <div className="text-base font-extrabold text-slate-900 font-display">
                        {acct.total_instances}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Scanned</div>
                      <div className="text-base font-extrabold text-green-600 font-display">
                        {acct.matched_assets}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Shadow</div>
                      <div
                        className={`text-base font-extrabold font-display ${
                          acct.unmatched_instances > 0 ? 'text-orange-600' : 'text-slate-400'
                        }`}
                      >
                        {acct.unmatched_instances}
                      </div>
                    </div>
                  </div>

                  {/* Severity 5, 4, 3 & Fixed Counts */}
                  <div className="py-2 px-3 bg-white rounded-xl border border-slate-100 my-2 text-xs">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-1">
                      Vulnerabilities (Sev 5, 4, 3 &amp; Fixed)
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-qred font-bold text-[10px] border border-red-200">
                          Sev 5: {acct.critical_vulns}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200">
                          Sev 4: {acct.high_vulns}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                          Sev 3: {acct.med_vulns}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                        {acct.fixed_vulns} Fixed
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 truncate mt-1">
                    Regions: {acct.regions.join(', ') || 'Global'}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedApmModal({
                        title: `AWS Account: ${acct.account_name} (${acct.account_id})`,
                        platform: 'AWS',
                        account_name: acct.account_name,
                        account_id: acct.account_id,
                        total_instances: acct.total_instances,
                        critical_vulns: acct.critical_vulns,
                        high_vulns: acct.high_vulns,
                        med_vulns: acct.med_vulns,
                        fixed_vulns: acct.fixed_vulns,
                        apm_details: acct.apm_details || [],
                      })
                      setSelectedApmSearch('')
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-qblue hover:bg-blue-700 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                  >
                    <GitCompare size={12} /> Match APM Details
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAccountFilter(acct.raw_key)
                      setActiveTab('matrix')
                    }}
                    className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    Discrepancies <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {awsAccounts.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No AWS inventory added yet. Click &ldquo;Add Cloud Inventory&rdquo; to upload an AWS export.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Azure Subscriptions Breakdown */}
      {activeTab === 'azure' && (
        <div className="p-6 space-y-6 bg-slate-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {azureSubscriptions.map((sub) => (
              <div
                key={sub.raw_key}
                className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-blue-400 p-4 rounded-2xl transition-all flex flex-col justify-between shadow-sm hover:shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {sub.subscription_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate max-w-[190px]">
                        ID: {sub.subscription_id}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-200">
                      {sub.coverage_pct}% Covered
                    </span>
                  </div>

                  {/* Coverage Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 my-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-green-500 h-2 rounded-full"
                      style={{ width: `${sub.coverage_pct}%` }}
                    />
                  </div>

                  {/* Asset Counts Strip */}
                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50 rounded-xl border border-slate-100 my-2">
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Total Assets</div>
                      <div className="text-base font-extrabold text-slate-900 font-display">
                        {sub.total_instances}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Scanned</div>
                      <div className="text-base font-extrabold text-green-600 font-display">
                        {sub.matched_assets}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Shadow</div>
                      <div
                        className={`text-base font-extrabold font-display ${
                          sub.unmatched_instances > 0 ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        {sub.unmatched_instances}
                      </div>
                    </div>
                  </div>

                  {/* Severity 5, 4, 3 & Fixed Counts */}
                  <div className="py-2 px-3 bg-white rounded-xl border border-slate-100 my-2 text-xs">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-1">
                      Vulnerabilities (Sev 5, 4, 3 &amp; Fixed)
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-qred font-bold text-[10px] border border-red-200">
                          Sev 5: {sub.critical_vulns}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200">
                          Sev 4: {sub.high_vulns}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                          Sev 3: {sub.med_vulns}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                        {sub.fixed_vulns} Fixed
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 truncate mt-1">
                    Resource Groups: {sub.resource_groups.join(', ') || 'N/A'}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedApmModal({
                        title: `Azure Subscription: ${sub.subscription_name} (${sub.subscription_id})`,
                        platform: 'AZURE',
                        account_name: sub.subscription_name,
                        account_id: sub.subscription_id,
                        total_instances: sub.total_instances,
                        critical_vulns: sub.critical_vulns,
                        high_vulns: sub.high_vulns,
                        med_vulns: sub.med_vulns,
                        fixed_vulns: sub.fixed_vulns,
                        apm_details: sub.apm_details || [],
                      })
                      setSelectedApmSearch('')
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-qblue hover:bg-blue-700 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                  >
                    <GitCompare size={12} /> Match APM Details
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAccountFilter(sub.raw_key)
                      setActiveTab('matrix')
                    }}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    Discrepancies <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {azureSubscriptions.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No Azure subscriptions added yet. Click &ldquo;Add Cloud Inventory&rdquo; to upload an Azure inventory file.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Network & Cisco Appliances */}
      {activeTab === 'network' && (
        <div className="p-6 space-y-6 bg-slate-50/40">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-qred flex items-center justify-center font-bold border border-red-200">
                  NET
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Network &amp; Cisco Infrastructure</h3>
                  <p className="text-xs text-slate-500">
                    Auto-classified Cisco IOS, ASA, Firewalls, Routers &amp; Network Appliances in Qualys.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedApmModal({
                      title: 'Network & Cisco Infrastructure',
                      platform: 'Network',
                      account_name: 'Network Infrastructure',
                      account_id: 'NET-CORP',
                      total_instances: networkSummary.asset_count,
                      critical_vulns: networkSummary.critical_vulns,
                      high_vulns: networkSummary.high_vulns,
                      med_vulns: networkSummary.med_vulns,
                      fixed_vulns: networkSummary.fixed_vulns,
                      apm_details: networkSummary.apm_details || [],
                    })
                    setSelectedApmSearch('')
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-qblue hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <GitCompare size={14} /> Match APM Details
                </button>
                <Link
                  to="/assets"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  View All Network Assets
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">Total Appliances</div>
                <div className="text-xl font-extrabold text-slate-900 font-display mt-1">
                  {networkSummary.asset_count}
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <div className="text-[10px] uppercase font-bold text-qred font-mono">Sev 5 (Critical)</div>
                <div className="text-xl font-extrabold text-qred font-display mt-1">
                  {networkSummary.critical_vulns}
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                <div className="text-[10px] uppercase font-bold text-orange-600 font-mono">Sev 4 (High)</div>
                <div className="text-xl font-extrabold text-orange-600 font-display mt-1">
                  {networkSummary.high_vulns}
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="text-[10px] uppercase font-bold text-green-700 font-mono">Fixed Vulns</div>
                <div className="text-xl font-extrabold text-green-700 font-display mt-1">
                  {networkSummary.fixed_vulns}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Discrepancy Matrix Table */}
      {activeTab === 'matrix' && (
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search instance name, IP, account name, ID..."
                className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={matrixStatus}
                onChange={(e) => setMatrixStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none"
              >
                <option value="ALL">All Match Statuses</option>
                <option value="MATCHED">Matched (Scanned in Qualys)</option>
                <option value="UNMATCHED">Unmatched (Shadow Asset)</option>
                <option value="CONFLICT">Conflict / Multiple</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-mono font-bold">
                  <th className="py-3 px-3">Instance / Host</th>
                  <th className="py-3 px-3">Cloud Provider</th>
                  <th className="py-3 px-3">Account Name / Subscription</th>
                  <th className="py-3 px-3">Private IP</th>
                  <th className="py-3 px-3">Region</th>
                  <th className="py-3 px-3">Application</th>
                  <th className="py-3 px-3">Qualys Match</th>
                  <th className="py-3 px-3 text-right">Findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{row.instance_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{row.instance_id || '—'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.cloud_provider === 'AWS'
                            ? 'bg-orange-50 text-orange-600 border border-orange-200'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}
                      >
                        {row.cloud_provider}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-800 font-medium">{row.account_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{row.account_id}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{row.private_ip || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{row.region || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{row.application || '—'}</td>
                    <td className="py-2.5 px-3">
                      {row.match_status === 'MATCHED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded font-medium">
                          <CheckCircle2 size={11} /> Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded font-medium">
                          <AlertTriangle size={11} /> Shadow Host
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.critical_vulns > 0 || row.high_vulns > 0 ? (
                        <div className="font-mono text-xs">
                          {row.critical_vulns > 0 && <span className="text-qred font-bold">{row.critical_vulns}C </span>}
                          {row.high_vulns > 0 && <span className="text-orange-600 font-bold">{row.high_vulns}H</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {matrixData.results.length === 0 && !loading && (
              <div className="py-10 text-center text-slate-400 text-xs">
                No matching cloud discrepancy records found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* APM & CMDB Correlation Modal Popup */}
      {selectedApmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-qblue flex items-center justify-center border border-blue-200 font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-qblue border border-blue-200">
                      {selectedApmModal.platform} CORRELATION
                    </span>
                    <span className="text-xs text-slate-500 font-mono">CMDB &amp; QUALYS</span>
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 font-display mt-0.5">
                    {selectedApmModal.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedApmModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Quick Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">APM Applications</div>
                <div className="text-lg font-extrabold text-slate-900 font-display mt-0.5">
                  {selectedApmModal.apm_details?.length || 0}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-qred font-mono">Sev 5 (30d SLA)</div>
                <div className="text-lg font-extrabold text-qred font-display mt-0.5">
                  {selectedApmModal.critical_vulns || 0}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-orange-600 font-mono">Sev 4 (90/120d)</div>
                <div className="text-lg font-extrabold text-orange-600 font-display mt-0.5">
                  {selectedApmModal.high_vulns || 0}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-amber-700 font-mono">Sev 3 (180d)</div>
                <div className="text-lg font-extrabold text-amber-700 font-display mt-0.5">
                  {selectedApmModal.med_vulns || 0}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-green-700 font-mono">Fixed Count</div>
                <div className="text-lg font-extrabold text-green-700 font-display mt-0.5">
                  {selectedApmModal.fixed_vulns || 0}
                </div>
              </div>
            </div>

            {/* Search Filter inside Modal */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-80">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search APM ID, Application, Owner, 5-digit ID..."
                  className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
                  value={selectedApmSearch}
                  onChange={(e) => setSelectedApmSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Showing {modalApmList.length} of {selectedApmModal.apm_details?.length || 0} mapped APMs
              </span>
            </div>

            {/* Modal Table Content */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-mono font-bold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">APM ID</th>
                    <th className="py-2.5 px-3">Application Name</th>
                    <th className="py-2.5 px-3">5-Digit Corr ID</th>
                    <th className="py-2.5 px-3">IT App Owner</th>
                    <th className="py-2.5 px-3">Business Owner</th>
                    <th className="py-2.5 px-3 text-center">IF / PCI Scope</th>
                    <th className="py-2.5 px-3 text-center">Assets</th>
                    <th className="py-2.5 px-3 text-center">Sev 5</th>
                    <th className="py-2.5 px-3 text-center">Sev 4</th>
                    <th className="py-2.5 px-3 text-center">Sev 3</th>
                    <th className="py-2.5 px-3 text-center">Fixed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalApmList.map((apm, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-qblue">
                        {apm.apm_id}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {apm.app_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {apm.correlation_id || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {apm.app_owner}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {apm.business_owner}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {apm.internet_facing ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-qred border border-red-200">
                              IF: YES
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500">
                              IF: NO
                            </span>
                          )}
                          {apm.pci_scope ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              PCI: YES
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500">
                              PCI: NO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {apm.asset_count}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {apm.crit > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-qred font-bold text-[10px] border border-red-200">
                            {apm.crit}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {apm.high > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200">
                            {apm.high}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {apm.med > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                            {apm.med}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {apm.fixed > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                            {apm.fixed}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {modalApmList.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No APM correlation records found for this account/subscription.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-[11px] text-slate-500 font-mono">
                SLA Compliance: Sev 5 = 30d | Sev 4 = 120d (90d if IF/PCI) | Sev 3 = 180d
              </div>
              <button
                onClick={() => setSelectedApmModal(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors"
              >
                Close Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
